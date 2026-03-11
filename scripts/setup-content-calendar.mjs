#!/usr/bin/env node

/**
 * Setup Content Calendar tab in the Borussia Minerals Google Sheet.
 *
 * Uses OAuth credentials from /tmp/drive-oauth-token.json and
 * /tmp/drive-oauth-client.json (same pattern as other Drive scripts).
 *
 * Usage: node scripts/setup-content-calendar.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";

const SPREADSHEET_ID = "1hjnbb4tvyZCfrOyo2puVMxYWfUlI2NGgc_Z3Ew7dWB8";
const TOKEN_PATH = "/tmp/drive-oauth-token.json";
const CLIENT_PATH = "/tmp/drive-oauth-client.json";

// --- Auth ---

function getOAuthClient() {
  const clientData = JSON.parse(readFileSync(CLIENT_PATH, "utf-8"));
  const tokenData = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));

  const { client_id, client_secret, redirect_uris } =
    clientData.installed || clientData.web;

  const oauth2 = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris?.[0]
  );
  oauth2.setCredentials(tokenData);
  return oauth2;
}

// --- Content Calendar data ---

const CALENDAR_HEADERS = [
  "Date",
  "Type",
  "Title",
  "Caption",
  "Image Source",
  "Status",
  "Instagram URL",
  "Notes",
];

const CALENDAR_ROWS = [
  [
    "2026-03-17",
    "social",
    "Fat Jack: The Origin Story",
    'The Fat Jack Mine sits in the rugged Bradshaw Mountains near Crown King, Arizona \u2014 a remote mining district that saw its first prospectors during the late 1800s gold rush. The mine takes its name from "Fat Jack," a larger-than-life prospector who worked claims in the Crown King district. #minerals #arizona #mining #fatjackmine',
    "wulf-003",
    "scheduled",
    "",
    "Pair with wulfenite specimen photo",
  ],
  [
    "2026-03-20",
    "social",
    "Fat Jack: The Working Mine",
    "Originally developed for its lead, silver, and gold deposits, the Fat Jack was a working metal mine through the early 20th century. The Bradshaw Mountains district produced significant tonnage of base metals. #fatjackmine #mininghistory #arizona",
    "wulf-003",
    "scheduled",
    "",
    "Pair with mine/locality photo",
  ],
  [
    "2026-03-24",
    "social",
    "Fat Jack: The Collector's Mine",
    "The mine's second life began when mineral collectors recognized the exceptional quality of its secondary mineral specimens \u2014 particularly wulfenite. Fat Jack wulfenite quickly earned a reputation as some of the finest from Arizona. #wulfenite #mineralcollecting #fatjackmine",
    "wulf-003",
    "draft",
    "",
    "Pair with best wulfenite photo",
  ],
  [
    "2026-03-27",
    "social",
    "New Pocket Discovery",
    "A significant new pocket has been discovered at the Fat Jack Mine. Details and specimens coming soon. #fatjackmine #newdiscovery #minerals",
    "",
    "draft",
    "",
    "TEASER \u2014 save for when Boris has photos ready",
  ],
  [
    "2026-03-31",
    "social",
    "Crystal Science: Wulfenite Color",
    "The distinctive orange-red color of Fat Jack wulfenite results from trace chromium substituting for molybdenum in the crystal structure. Crystals typically form as thin tabular plates. #mineralscience #wulfenite #crystals",
    "wulf-003",
    "draft",
    "",
    "Pair with macro crystal photo",
  ],
  [
    "2026-04-03",
    "social",
    "Fat Jack Mineral Diversity",
    "Minerals found at Fat Jack: Wulfenite, Vanadinite, Mimetite, Cerussite. The secondary mineral assemblage occurs in oxidized zones along fault structures in Precambrian metamorphic rock. #minerals #geology #fatjackmine",
    "",
    "draft",
    "",
    "Pair with group specimen photo",
  ],
];

// --- Main ---

async function main() {
  const auth = getOAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Add "Content Calendar" tab
  console.log("Adding Content Calendar tab...");
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Content Calendar",
              },
            },
          },
        ],
      },
    });
    console.log("  Created tab: Content Calendar");
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log("  Tab already exists, continuing...");
    } else {
      throw err;
    }
  }

  // 2. Write header + data rows to Content Calendar
  console.log("Writing Content Calendar data...");
  const calendarValues = [CALENDAR_HEADERS, ...CALENDAR_ROWS];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Content Calendar'!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: calendarValues,
    },
  });
  console.log(`  Wrote header + ${CALENDAR_ROWS.length} content rows`);

  // 3. Add publish_status (M) and instagram_posted (N) headers to Sheet1
  console.log("Adding publish_status and instagram_posted headers to Sheet1...");
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!M1:N1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["publish_status", "instagram_posted"]],
    },
  });
  console.log("  Set Sheet1 M1=publish_status, N1=instagram_posted");

  // 4. Set existing 10 specimen rows to "published" in column M
  console.log('Setting 10 specimen rows to "published"...');
  const publishedValues = Array.from({ length: 10 }, () => ["published"]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sheet1!M2:M11",
    valueInputOption: "RAW",
    requestBody: {
      values: publishedValues,
    },
  });
  console.log("  Set Sheet1 M2:M11 = published");

  console.log("\nDone. Content Calendar is ready.");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
