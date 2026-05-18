#!/usr/bin/env bun
/**
 * scripts/seed-mines-localities.ts
 *
 * One-shot idempotent seed: Mines + Localities → Airtable.
 *
 * Modes:
 *   (default, no flag)  Dry-run — prints what WOULD be upserted to stdout. No writes.
 *   --commit            Execute upserts in Airtable. Idempotent — re-running = 0 new rows.
 *
 * Env vars required for --commit:
 *   BORUSSIA_AIRTABLE_TOKEN   — base-scoped PAT
 *   BORUSSIA_AIRTABLE_BASE_ID — base ID (defaults to appOBaUxz1Qmtjz4H)
 *
 * Usage:
 *   bun scripts/seed-mines-localities.ts              # dry run
 *   bun scripts/seed-mines-localities.ts --commit     # actually write
 */

import { resolve } from "path";
import * as dotenv from "dotenv";

// Load .env.local (for local runs)
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// ── Parse flags ────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const COMMIT  = args.includes("--commit");
const DRY_RUN = !COMMIT;

console.log(`[seed] mode: ${COMMIT ? "COMMIT" : "DRY-RUN"}`);

// ── Airtable config ────────────────────────────────────────────────────────────

const BASE_ID         = process.env.BORUSSIA_AIRTABLE_BASE_ID ?? "appOBaUxz1Qmtjz4H";
const TABLE_MINES     = "tblRv7YtauWwI8Vi6";
const TABLE_LOCALITIES = "tblGdYctcj3nLFBnw";
const RATE_LIMIT      = 5;
const WINDOW_MS       = 1_000;

const bucket = { tokens: RATE_LIMIT, refilledAt: Date.now() };

async function rateLimit(): Promise<void> {
  const now     = Date.now();
  const elapsed = now - bucket.refilledAt;
  if (elapsed >= WINDOW_MS) { bucket.tokens = RATE_LIMIT; bucket.refilledAt = now; }
  if (bucket.tokens > 0) { bucket.tokens--; return; }
  await new Promise(r => setTimeout(r, WINDOW_MS - elapsed));
  bucket.tokens    = RATE_LIMIT - 1;
  bucket.refilledAt = Date.now();
}

function getToken(): string {
  const t = process.env.BORUSSIA_AIRTABLE_TOKEN;
  if (!t) throw new Error("[seed] BORUSSIA_AIRTABLE_TOKEN not set. Export it before running with --commit.");
  return t;
}

interface AirtableRecord { id: string; fields: Record<string, unknown>; }
interface ListResponse   { records: AirtableRecord[]; offset?: string; }

async function atFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await rateLimit();
  const token = getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...init, headers, signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
    await new Promise(r => setTimeout(r, retryAfter * 1_000));
    await rateLimit();
    return fetch(`https://api.airtable.com/v0${path}`, { ...init, headers });
  }
  return res;
}

async function upsertByField(
  tableId: string,
  field: string,
  value: string,
  fields: Record<string, unknown>,
): Promise<{ id: string; created: boolean; action: string }> {
  const formula   = `{${field}} = "${value.replace(/"/g, '\\"')}"`;
  const params    = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const searchRes = await atFetch(`/${BASE_ID}/${tableId}?${params.toString()}`);

  if (searchRes.ok) {
    const data = await searchRes.json() as ListResponse;
    if (data.records?.length) {
      const existing  = data.records[0];
      const patchRes  = await atFetch(`/${BASE_ID}/${tableId}/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
      if (patchRes.ok) return { id: existing.id, created: false, action: "updated" };
    }
  }

  const createRes = await atFetch(`/${BASE_ID}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`[seed] create failed ${createRes.status}: ${text}`);
  }
  const record = await createRes.json() as AirtableRecord;
  return { id: record.id, created: true, action: "created" };
}

// ── Mine definitions ──────────────────────────────────────────────────────────
//
// Source: src/data/mines/fat-jack.ts (full) + src/data/localities.ts (partial — 4 AZ mines)
// Partial mines have name/location/minerals; history/geology left blank for Director.

interface MineInput {
  slug: string;
  name: string;
  location: string;
  short_description?: string;
  history?: string;
  geology?: string;
  established?: string;
  minerals?: string[];
}

const MINES: MineInput[] = [
  // Full record from src/data/mines/fat-jack.ts
  {
    slug: "fat-jack",
    name: "Fat Jack Mine",
    location: "Yavapai County, Arizona, USA",
    short_description:
      "A historic Arizona mine in the Bradshaw Mountains, known for producing some of the finest wulfenite specimens in the state. Owned by Borussia Minerals since June 2025.",
    history: `The Fat Jack Mine sits in the Bradshaw Mountains near Crown King, Arizona. Named after a prospector who worked claims in the district during the late 1800s gold rush, it was originally a lead, silver, and gold operation.

The mine earned its reputation among collectors for producing outstanding wulfenite — orange-red tabular crystals with adamantine luster. Specimens from the Fat Jack are in museum and private collections worldwide.

Borussia Minerals acquired the mine in June 2025. Recent work has uncovered a significant new pocket — details coming soon.`,
    geology: `Lead-zinc-silver mineralization in oxidized zones along fault structures in Precambrian metamorphic rock. The secondary mineral assemblage includes wulfenite, vanadinite, mimetite, and cerussite.

Fat Jack wulfenite gets its distinctive orange-red color from trace chromium in the crystal structure. Crystals form as thin tabular plates, often perched on matrix.`,
    established: "Early 1900s",
    minerals: ["Wulfenite", "Vanadinite", "Mimetite", "Cerussite"],
  },
  // Partial records from src/data/localities.ts
  {
    slug: "morenci",
    name: "Morenci Mine",
    location: "Greenlee County, Arizona, USA",
    short_description:
      "One of the largest open-pit copper mines in North America. Famous for world-class azurite and malachite specimens.",
    minerals: ["Azurite", "Malachite", "Selenite"],
  },
  {
    slug: "new-cornelia",
    name: "New Cornelia Mine",
    location: "Pima County, Arizona, USA",
    short_description:
      "Historic porphyry copper mine near Ajo. Source of exceptional malachite pseudomorphs after azurite on porphyry matrix.",
    minerals: ["Malachite", "Azurite", "Chrysocolla"],
  },
  {
    slug: "bagdad",
    name: "Bagdad",
    location: "Yavapai County, Arizona, USA",
    short_description:
      "Classic Arizona copper locality known for multi-generation pseudomorphs. Chrysocolla replacing azurite replacing malachite.",
    minerals: ["Chrysocolla", "Azurite", "Malachite"],
  },
  {
    slug: "ray",
    name: "Ray Mine / Pearl Handle Pit",
    location: "Pinal County, Arizona, USA",
    short_description:
      "Premier source for Arizona cuprite-on-copper association specimens from the Mineral Creek District.",
    minerals: ["Cuprite", "Native Copper"],
  },
];

function mineToFields(m: MineInput): Record<string, unknown> {
  return {
    slug:              m.slug,
    name:              m.name,
    location:          m.location,
    ...(m.short_description ? { short_description: m.short_description } : {}),
    ...(m.history           ? { history:           m.history }           : {}),
    ...(m.geology           ? { geology:           m.geology }           : {}),
    ...(m.established       ? { established:       m.established }       : {}),
    ...(m.minerals?.length  ? { minerals:          m.minerals }          : {}),
  };
}

// ── Locality definitions ──────────────────────────────────────────────────────
//
// Sources:
//   - src/data/localities.ts: morenci, new-cornelia, bagdad, ray (with lat/lon)
//   - Audit §5.3 distinct locality strings from Sheet col D (lat/lon: Director fills later)
//
// NOT included: carlota, rowley, lhanda, mfouati as Mines — pending Director decision §5.2
// Those appear here as Localities only (audit §5.3 listed them as distinct locality strings).

interface LocalityInput {
  name: string;
  region?: string;   // US state or country
  country?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

const LOCALITIES: LocalityInput[] = [
  // From src/data/localities.ts (with lat/lon)
  {
    name: "Morenci Mine",
    region: "Arizona",
    country: "United States",
    latitude: 33.07,
    longitude: -109.37,
    notes: "One of the largest open-pit copper mines in North America. Greenlee County, AZ.",
  },
  {
    name: "New Cornelia Mine",
    region: "Arizona",
    country: "United States",
    latitude: 32.37,
    longitude: -112.86,
    notes: "Historic porphyry copper mine near Ajo. Pima County, AZ.",
  },
  {
    name: "Bagdad",
    region: "Arizona",
    country: "United States",
    latitude: 34.58,
    longitude: -113.15,
    notes: "Classic Arizona copper locality. Yavapai County, AZ.",
  },
  {
    name: "Ray Mine / Pearl Handle Pit",
    region: "Arizona",
    country: "United States",
    latitude: 33.15,
    longitude: -110.97,
    notes: "Premier source for Arizona cuprite-on-copper specimens. Pinal County, AZ.",
  },
  // From Sheet audit §5.3 distinct locality strings (lat/lon: Director fills later)
  {
    name: "Pearl Handle Pit, Ray Mine, Pinal County, AZ",
    region: "Arizona",
    country: "United States",
    notes: "Pit within Ray Mine complex. Distinct Sheet string — may merge with Ray Mine / Pearl Handle Pit.",
  },
  {
    name: "Bisbee, Cochise County, AZ",
    region: "Arizona",
    country: "United States",
    notes: "Historic mining district. Cochise County, AZ. Note: conflicts with static TS which lists chry-001 as Bagdad.",
  },
  {
    name: "Rowley Mine, Maricopa County, AZ",
    region: "Arizona",
    country: "United States",
    notes: "Maricopa County, AZ. Referenced in Sheet specimen locality strings.",
  },
  {
    name: "Carlota Mine, AZ",
    region: "Arizona",
    country: "United States",
    notes: "AZ copper mine. Referenced in Sheet specimen locality strings. Director to fill lat/lon.",
  },
  {
    name: "Metcalf Pit, Morenci, Greenlee County, AZ",
    region: "Arizona",
    country: "United States",
    notes: "Pit within Morenci complex. Greenlee County, AZ.",
  },
  {
    name: "M'Fouati, Bouenza Department, Republic of Congo",
    region: "Bouenza Department",
    country: "Republic of Congo",
    notes: "Locality for wulf-004. Republic of Congo.",
  },
  {
    name: "Lhanda Mine, Mexico",
    region: "Mexico",
    country: "Mexico",
    notes: "Mexico mine locality. Director to fill state/lat/lon.",
  },
];

function localityToFields(l: LocalityInput): Record<string, unknown> {
  return {
    name:      l.name,
    ...(l.region    ? { region:    l.region }    : {}),
    ...(l.country   ? { country:   l.country }   : {}),
    ...(l.latitude  !== undefined ? { latitude:  l.latitude }  : {}),
    ...(l.longitude !== undefined ? { longitude: l.longitude } : {}),
    ...(l.notes     ? { notes:     l.notes }     : {}),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[seed] Mines: ${MINES.length} records to upsert`);
  for (const m of MINES) {
    console.log(`  mine: ${m.slug} — "${m.name}" (${m.location})${m.minerals ? ` [${m.minerals.join(", ")}]` : ""}`);
  }

  console.log(`\n[seed] Localities: ${LOCALITIES.length} records to upsert`);
  for (const l of LOCALITIES) {
    const coords = l.latitude !== undefined ? ` (${l.latitude}, ${l.longitude})` : " (lat/lon: TBD)";
    console.log(`  locality: "${l.name}"${coords}`);
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] No writes performed.");
    console.log(`  Would upsert ${MINES.length} mines and ${LOCALITIES.length} localities.`);
    console.log("  Run with --commit to execute.");
    return;
  }

  // ── COMMIT mode ─────────────────────────────────────────────────────────────

  console.log("\n[commit] Phase 1: Upserting mines…");
  let mineCreated = 0, mineUpdated = 0;
  for (const mine of MINES) {
    const fields = mineToFields(mine);
    const result = await upsertByField(TABLE_MINES, "slug", mine.slug, fields);
    if (result.created) { mineCreated++; } else { mineUpdated++; }
    console.log(`  mine ${mine.slug}: ${result.action} (id=${result.id})`);
  }

  console.log("\n[commit] Phase 2: Upserting localities…");
  let localityCreated = 0, localityUpdated = 0;
  for (const locality of LOCALITIES) {
    const fields = localityToFields(locality);
    const result = await upsertByField(TABLE_LOCALITIES, "name", locality.name, fields);
    if (result.created) { localityCreated++; } else { localityUpdated++; }
    console.log(`  locality "${locality.name}": ${result.action} (id=${result.id})`);
  }

  console.log("\n[commit] Done.");
  console.log(`  Mines:      ${mineCreated} created, ${mineUpdated} updated`);
  console.log(`  Localities: ${localityCreated} created, ${localityUpdated} updated`);
  console.log("\n  Re-running --commit will produce 0 created, N updated (idempotent).");
}

main().catch(err => {
  console.error("[seed] fatal:", err);
  process.exit(1);
});
