#!/usr/bin/env bun
/**
 * publish-check.ts — Pre-deploy readiness check for Borussia Minerals inventory.
 *
 * Reads the Google Sheet and reports which specimens are ready to publish,
 * which are published, and which are blocked (with reasons).
 *
 * Usage: bun run scripts/publish-check.ts
 */

import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!SHEET_ID || !SERVICE_KEY) {
  console.error("Missing GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}

const credentials = JSON.parse(SERVICE_KEY);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: "Inventory!A1:P",
});

const [header, ...rows] = res.data.values ?? [];
if (!header) {
  console.error("No data in Sheet");
  process.exit(1);
}

// Column indices
const col = (name: string) => header.indexOf(name);
const ID = col("ID");
const NAME = col("Name");
const PRICE = col("Price");
const PUBLISH = col("publish_status");
const PHOTO = col("photo_status");

const published: string[] = [];
const ready: string[] = [];
const blocked: { id: string; reasons: string[] }[] = [];

for (const row of rows) {
  const id = row[ID] || "";
  const name = row[NAME] || "";
  const price = row[PRICE] || "";
  const publishStatus = row[PUBLISH] || "";
  const photoStatus = row[PHOTO] || "";

  if (!id) continue;

  if (publishStatus === "published") {
    published.push(`${id} — ${name}`);
    continue;
  }

  const reasons: string[] = [];
  if (!price) reasons.push("no price");
  if (!name) reasons.push("no name");
  if (photoStatus !== "hero_set") reasons.push(`photo: ${photoStatus || "none"}`);

  if (reasons.length === 0) {
    ready.push(`${id} — ${name} ($${price})`);
  } else {
    blocked.push({ id: `${id} — ${name || "(unnamed)"}`, reasons });
  }
}

console.log(`\n=== BORUSSIA MINERALS — PUBLISH CHECK ===\n`);
console.log(`PUBLISHED (${published.length}):`);
for (const s of published) console.log(`  ✓ ${s}`);

console.log(`\nREADY TO PUBLISH (${ready.length}):`);
for (const s of ready) console.log(`  → ${s}`);

console.log(`\nBLOCKED (${blocked.length}):`);
for (const { id, reasons } of blocked)
  console.log(`  ✗ ${id} — ${reasons.join(", ")}`);

console.log(
  `\nTOTAL: ${published.length} live, ${ready.length} ready, ${blocked.length} blocked`
);
