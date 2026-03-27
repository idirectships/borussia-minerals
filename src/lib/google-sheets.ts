import { google } from "googleapis";
import type { Specimen } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Cache to avoid redundant API calls during build (same pattern as google-copy.ts)
let allSpecimensCache: Specimen[] | null = null;

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    return null;
  }

  const credentials = JSON.parse(key);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID not set");
  }
  return id;
}

interface SheetRow {
  id: string;
  name: string;
  mineral: string;
  locality: string;
  crystalSystem: string;
  dimensions: string;
  weight: string;
  price: string;
  availability: string;
  description: string;
  photoIds: string;
  notes: string;
  publishStatus: string;
}

function rowToSpecimen(row: SheetRow): Specimen {
  const price = row.price ? parseFloat(row.price) : undefined;
  const availability = (row.availability?.toLowerCase().replace(/ /g, "-") || "available") as
    | "available"
    | "sold"
    | "reserved"
    | "private-collection";

  // Build image URL — check for Drive photo IDs, fall back to local specimen image
  const photoIds = row.photoIds
    ? row.photoIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  let image: string;
  let images: string[] | undefined;
  if (photoIds.length > 0) {
    image = `https://lh3.googleusercontent.com/d/${photoIds[0]}`;
    if (photoIds.length > 1) {
      images = photoIds.map((id) => `https://lh3.googleusercontent.com/d/${id}`);
    }
  } else {
    // Local specimen photo: /images/specimens/{id}.jpg
    image = `/images/specimens/${row.id}.jpg`;
  }

  return {
    id: row.id,
    name: row.name,
    image,
    ...(images && { images }),
    locality: row.locality || "",
    crystalSystem: row.crystalSystem || "",
    dimensions: row.dimensions || "",
    weight: row.weight || undefined,
    description: row.description || "",
    price: isNaN(price!) ? undefined : price,
    availability,
    mineralGroup: row.mineral || undefined,
    publishStatus: (row.publishStatus || "published") as "draft" | "review" | "published",
  };
}

export async function fetchAllSpecimens(): Promise<Specimen[]> {
  if (allSpecimensCache) return allSpecimensCache;

  const auth = getAuth();
  if (!auth) {
    console.warn("Google Sheets not configured — returning empty specimens");
    return [];
  }
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const sheetId = getSheetId();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Inventory!A2:M", // Skip header row (A-M, includes publish_status)
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    allSpecimensCache = rows
      .map((row): SheetRow => ({
        id: row[0] || "",
        name: row[1] || "",
        mineral: row[2] || "",
        locality: row[3] || "",
        crystalSystem: row[4] || "",
        dimensions: row[5] || "",
        weight: row[6] || "",
        price: row[7] || "",
        availability: row[8] || "available",
        description: row[9] || "",
        photoIds: row[10] || "",
        notes: row[11] || "",
        publishStatus: row[12] || "published",
      }))
      .filter((row) => row.id && row.name) // Skip empty rows
      .map(rowToSpecimen);

    return allSpecimensCache;
  } catch (err) {
    console.warn("Google Sheets fetch failed — returning empty specimens:", (err as Error).message);
    return [];
  }
}

export async function fetchSpecimens(): Promise<Specimen[]> {
  const all = await fetchAllSpecimens();
  return all.filter((s) => s.publishStatus === "published");
}

export async function fetchSpecimenById(
  id: string
): Promise<Specimen | undefined> {
  const specimens = await fetchSpecimens();
  return specimens.find((s) => s.id === id);
}

/**
 * Marks one or more specimens as "sold" in the Google Sheet.
 * Column I (index 8, 1-based = column 9) is "availability".
 * Scans Inventory!A2:A to find the row index, then patches column I.
 */
export async function markSpecimensAsSold(specimenIds: string[]): Promise<void> {
  if (specimenIds.length === 0) return;

  const auth = getAuth();
  if (!auth) {
    console.error("markSpecimensAsSold: GOOGLE_SERVICE_ACCOUNT_KEY not configured");
    return;
  }

  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = getSheetId();

  // Fetch all IDs from column A to find row positions (data starts at row 2)
  const idResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Inventory!A2:A",
  });

  const idRows = idResponse.data.values ?? [];
  const updates: { range: string; values: string[][] }[] = [];

  for (const specimenId of specimenIds) {
    const rowIndex = idRows.findIndex((row) => row[0] === specimenId);
    if (rowIndex === -1) {
      console.warn(`markSpecimensAsSold: specimen ${specimenId} not found in sheet`);
      continue;
    }
    // Sheet row number: data starts at row 2, so rowIndex 0 → row 2
    const sheetRow = rowIndex + 2;
    // Column I = availability (columns: A=id, B=name, C=mineral, D=locality,
    // E=crystalSystem, F=dimensions, G=weight, H=price, I=availability)
    updates.push({ range: `Inventory!I${sheetRow}`, values: [["sold"]] });
  }

  if (updates.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  // Bust the in-process cache so subsequent reads reflect the sold status
  allSpecimensCache = null;

  console.log(`markSpecimensAsSold: marked ${updates.length} specimen(s) as sold`, specimenIds);
}
