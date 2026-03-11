import { google } from "googleapis";
import type { Specimen } from "@/types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

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
    image = `https://drive.google.com/uc?export=view&id=${photoIds[0]}`;
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
  };
}

export async function fetchSpecimens(): Promise<Specimen[]> {
  const auth = getAuth();
  if (!auth) {
    console.warn("Google Sheets not configured — returning empty specimens");
    return [];
  }
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A2:L", // Skip header row
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows
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
    }))
    .filter((row) => row.id && row.name) // Skip empty rows
    .map(rowToSpecimen);
}

export async function fetchSpecimenById(
  id: string
): Promise<Specimen | undefined> {
  const specimens = await fetchSpecimens();
  return specimens.find((s) => s.id === id);
}
