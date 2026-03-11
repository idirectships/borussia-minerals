import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

// Type for a copy entry
export interface CopyEntry {
  key: string;
  value: string;
  section: string;
  page: string;
}

// Cache for build-time fetches (avoid re-fetching during SSG)
let copyCache: CopyEntry[] | null = null;

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

export async function fetchAllCopy(): Promise<CopyEntry[]> {
  if (copyCache) return copyCache;

  const auth = getAuth();
  if (!auth) {
    console.warn("Google Sheets not configured — returning empty copy");
    return [];
  }
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Copy!A2:D",
  });

  const rows = response.data.values || [];
  copyCache = rows.map((row) => ({
    key: row[0] || "",
    value: row[1] || "",
    section: row[2] || "",
    page: row[3] || "",
  }));

  return copyCache;
}

// Get all copy for a specific page
export async function getPageCopy(
  page: string
): Promise<Record<string, string>> {
  const allCopy = await fetchAllCopy();
  const pageCopy = allCopy.filter((entry) => entry.page === page);
  return Object.fromEntries(pageCopy.map((entry) => [entry.key, entry.value]));
}

// Get a single copy value with fallback
export async function getCopyValue(
  key: string,
  fallback: string = ""
): Promise<string> {
  const allCopy = await fetchAllCopy();
  const entry = allCopy.find((e) => e.key === key);
  return entry?.value || fallback;
}
