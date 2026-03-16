#!/usr/bin/env node

/**
 * Batch-update specimen descriptions in Google Sheets.
 *
 * Usage:  node scripts/update-descriptions.mjs
 *
 * Reads GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SHEET_ID from .env.local,
 * then writes BLUF descriptions to column J (description) for each
 * specimen ID found in Inventory.
 */

import { readFileSync } from "fs";
import { google } from "googleapis";

// ---------------------------------------------------------------------------
// 1. Load .env.local manually (no dep on dotenv)
// ---------------------------------------------------------------------------
function loadEnv(path = ".env.local") {
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    console.error(`Could not read ${path} — make sure it exists.`);
    process.exit(1);
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// 2. Auth (mirrors src/lib/google-sheets.ts)
// ---------------------------------------------------------------------------
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error("GOOGLE_SERVICE_ACCOUNT_KEY is not set.");
    process.exit(1);
  }
  const credentials = JSON.parse(key);
  return new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
}

function getSheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    console.error("GOOGLE_SHEET_ID is not set.");
    process.exit(1);
  }
  return id;
}

// ---------------------------------------------------------------------------
// 3. BLUF descriptions keyed by specimen ID
// ---------------------------------------------------------------------------
const BLUF_DESCRIPTIONS = {
  "wulf-003":
    "Wulfenite (PbMoO4) on matrix from the Fat Jack Mine, Yavapai County, Arizona. Tetragonal crystal system. Amber-orange tabular crystals with adamantine to resinous luster and exceptional transparency. Chromium trace impurities produce the characteristic orange-red coloration. Mohs hardness 2.5-3. Collected from Borussia Minerals\u2019 own claim, acquired June 2025.",
  "wulf-004":
    "Wulfenite (PbMoO4) cluster from the Fat Jack Mine, Yavapai County, Arizona. Tetragonal crystal system. Multiple intergrown tabular crystals with adamantine luster. Molybdate group. Mohs hardness 2.5-3.",
  "azur-003":
    "Azurite (Cu3(CO3)2(OH)2) crystal cluster. Monoclinic crystal system. Deep azure-blue prismatic crystals with vitreous to adamantine luster. Copper carbonate hydroxide. Mohs hardness 3.5-4.",
  "azur-004":
    "Azurite (Cu3(CO3)2(OH)2) specimen. Monoclinic crystal system. Vitreous to adamantine luster with strong color saturation. Copper carbonate hydroxide. Mohs hardness 3.5-4.",
  "azur-005":
    "Azurite (Cu3(CO3)2(OH)2) specimen. Monoclinic crystal system. Vitreous luster. Copper carbonate hydroxide. Mohs hardness 3.5-4.",
  "azur-006":
    "Azurite (Cu3(CO3)2(OH)2) specimen. Monoclinic crystal system. Vitreous luster. Copper carbonate hydroxide. Mohs hardness 3.5-4.",
  "cupr-001":
    "Cuprite (Cu2O) specimen. Isometric (cubic) crystal system. Crimson-red to dark red with adamantine to submetallic luster. Mohs hardness 3.5-4. Oxide group.",
  "cupr-002":
    "Cuprite (Cu2O) on copper specimen. Isometric (cubic) crystal system. Deep red crystals with adamantine luster on native copper matrix. Mohs hardness 3.5-4. Oxide group.",
  "chry-001":
    "Chrysocolla ((Cu,Al)2H2Si2O5(OH)4\u00B7nH2O) specimen. Amorphous to orthorhombic. Blue-green to cyan with vitreous to waxy luster. Mohs hardness 2-4. Phyllosilicate group.",
  "mala-002":
    "Malachite (Cu2(CO3)(OH)2) with fibrous habit. Monoclinic crystal system. Deep emerald-green with silky to adamantine luster. Mohs hardness 3.5-4. Carbonate group.",
};

// ---------------------------------------------------------------------------
// 4. Main
// ---------------------------------------------------------------------------
async function main() {
  const auth = getAuth();
  const sheetId = getSheetId();
  const sheets = google.sheets({ version: "v4", auth });

  // Read all rows (A2:M) — same range as google-sheets.ts
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Inventory!A2:M",
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log("Sheet is empty — nothing to update.");
    return;
  }

  // Build a map of specimen ID → sheet row number (1-based, accounting for header)
  // Row 1 = header, data starts at row 2, so rows[i] is sheet row (i + 2)
  const idToRow = new Map();
  for (let i = 0; i < rows.length; i++) {
    const id = rows[i][0];
    if (id) {
      idToRow.set(id, i + 2); // sheet row number (1-based)
    }
  }

  // Build batch update data — description is column J
  const data = [];
  const updated = [];
  const notFound = [];

  for (const [specimenId, description] of Object.entries(BLUF_DESCRIPTIONS)) {
    const rowNum = idToRow.get(specimenId);
    if (rowNum === undefined) {
      notFound.push(specimenId);
      continue;
    }
    data.push({
      range: `Inventory!J${rowNum}`,
      values: [[description]],
    });
    updated.push({ id: specimenId, row: rowNum });
  }

  if (data.length === 0) {
    console.log("No matching specimen IDs found in the sheet.");
    if (notFound.length > 0) {
      console.log("Not found:", notFound.join(", "));
    }
    return;
  }

  // Batch update
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });

  // Report
  console.log(`Updated ${updated.length} descriptions:`);
  for (const { id, row } of updated) {
    console.log(`  ${id} -> row ${row}`);
  }
  if (notFound.length > 0) {
    console.log(`\nNot found in sheet (${notFound.length}):`);
    for (const id of notFound) {
      console.log(`  ${id}`);
    }
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
