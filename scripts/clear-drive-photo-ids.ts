/**
 * Clear stale Google Drive photoIds from Sheet for specimens that have local photos.
 * This makes all specimens use /images/specimens/{id}.jpg instead of Drive URLs.
 *
 * Run: bun scripts/clear-drive-photo-ids.ts
 */
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SA_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: SA_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Get all rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Inventory!A2:M",
  });

  const rows = res.data.values ?? [];
  const imgDir = path.join(__dirname, "../public/images/specimens");
  const updates: { range: string; values: string[][] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const id = rows[i][0];
    const photoIds = rows[i][10] || "";
    const sheetRow = i + 2; // data starts at row 2

    if (!id) continue;

    // Check if local photo exists
    const localPhoto = path.join(imgDir, `${id}.jpg`);
    const hasLocal = fs.existsSync(localPhoto);

    if (photoIds && hasLocal) {
      console.log(`${id}: has Drive IDs AND local photo → clearing Drive IDs (row ${sheetRow})`);
      updates.push({
        range: `Inventory!K${sheetRow}`,
        values: [[""]],
      });
    } else if (photoIds && !hasLocal) {
      console.log(`${id}: has Drive IDs, NO local photo → keeping Drive IDs`);
    } else if (!photoIds && hasLocal) {
      console.log(`${id}: no Drive IDs, has local photo → already correct`);
    } else {
      console.log(`${id}: no Drive IDs, no local photo → MISSING IMAGE`);
    }
  }

  if (updates.length === 0) {
    console.log("\nNo updates needed.");
    return;
  }

  console.log(`\nClearing photoIds for ${updates.length} specimens...`);
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  console.log("Done. All specimens with local photos now use /images/specimens/{id}.jpg");
}

main().catch(console.error);
