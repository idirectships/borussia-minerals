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
  const availability = (row.availability?.toLowerCase() || "available") as
    | "available"
    | "sold"
    | "reserved";

  // Build image URL — check for Drive photo IDs, fall back to local specimen image
  const photoIds = row.photoIds
    ? row.photoIds.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  let image: string;
  if (photoIds.length > 0) {
    image = `https://lh3.googleusercontent.com/d/${photoIds[0]}`;
  } else {
    // Local specimen photo: /images/specimens/{id}.jpg
    image = `/images/specimens/${row.id}.jpg`;
  }

  return {
    id: row.id,
    name: row.name,
    image,
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
