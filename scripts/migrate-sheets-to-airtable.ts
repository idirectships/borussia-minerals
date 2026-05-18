#!/usr/bin/env bun
/**
 * scripts/migrate-sheets-to-airtable.ts
 *
 * One-shot idempotent migration: Google Sheets + static TS data → Airtable.
 *
 * Modes:
 *   (default, no flag)  Dry-run — writes preview to /tmp/airtable-migration-preview.json. NO Airtable writes.
 *   --commit            Execute creates/updates in Airtable. Idempotent — re-running = 0 new rows if unchanged.
 *   --diff              Show additions/removals against current Airtable state. No writes.
 *
 * Env vars (must be set for --commit and --diff):
 *   BORUSSIA_AIRTABLE_TOKEN   — base-scoped PAT
 *   BORUSSIA_AIRTABLE_BASE_ID — base ID (defaults to appOBaUxz1Qmtjz4H)
 *   GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEET_ID — for live sheet fetch (optional, falls back to static data)
 *
 * Usage:
 *   bun scripts/migrate-sheets-to-airtable.ts           # dry run
 *   bun scripts/migrate-sheets-to-airtable.ts --commit  # actually write
 *   bun scripts/migrate-sheets-to-airtable.ts --diff    # compare current state
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

// Load .env.local (for local runs)
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import type { Specimen, Mine } from "../src/types/index";

// ── Parse flags ────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const COMMIT  = args.includes("--commit");
const DIFF    = args.includes("--diff");
const DRY_RUN = !COMMIT && !DIFF;

console.log(`[migrate] mode: ${COMMIT ? "COMMIT" : DIFF ? "DIFF" : "DRY-RUN"}`);

// ── Source 1: Static TS data ──────────────────────────────────────────────────

async function loadStaticSpecimens(): Promise<Specimen[]> {
  const { specimens } = await import("../src/data/specimens/index");
  return specimens;
}

async function loadStaticMines(): Promise<Mine[]> {
  const { mines } = await import("../src/data/mines/index");
  return mines;
}

// ── Source 2: Google Sheets (optional) ────────────────────────────────────────

async function loadSheetsSpecimens(): Promise<Specimen[]> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.log("[migrate] Google Sheets env vars not set — skipping sheet fetch");
    return [];
  }
  try {
    const { fetchAllSpecimens } = await import("../src/lib/google-sheets");
    return fetchAllSpecimens();
  } catch (err) {
    console.warn("[migrate] Google Sheets fetch failed:", (err as Error).message);
    return [];
  }
}

// ── Merge + deduplicate ────────────────────────────────────────────────────────

function mergeSpecimens(staticList: Specimen[], sheetsList: Specimen[]): Specimen[] {
  const map = new Map<string, Specimen>();
  // Static data first, then sheets override (sheets may be more up-to-date)
  for (const s of staticList) { if (s.id) map.set(s.id, s); }
  for (const s of sheetsList) { if (s.id) map.set(s.id, s); }
  return [...map.values()];
}

// ── Airtable helpers (inline to avoid circular import issues in bun script) ───

const BASE_ID         = process.env.BORUSSIA_AIRTABLE_BASE_ID ?? "appOBaUxz1Qmtjz4H";
const TABLE_SPECIMENS = "tblovCHa4wKP6ZGnz";
const TABLE_MINES     = "tblRv7YtauWwI8Vi6";
const TABLE_LOCALITIES = "tblGdYctcj3nLFBnw";
const RATE_LIMIT      = 5;
const WINDOW_MS       = 1_000;

const buckets = new Map<string, { tokens: number; refilledAt: number }>();

async function rateLimit(): Promise<void> {
  const now    = Date.now();
  let   bucket = buckets.get(BASE_ID);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT, refilledAt: now };
    buckets.set(BASE_ID, bucket);
  }
  const elapsed = now - bucket.refilledAt;
  if (elapsed >= WINDOW_MS) { bucket.tokens = RATE_LIMIT; bucket.refilledAt = now; }
  if (bucket.tokens > 0) { bucket.tokens--; return; }
  await new Promise(r => setTimeout(r, WINDOW_MS - elapsed));
  bucket.tokens    = RATE_LIMIT - 1;
  bucket.refilledAt = Date.now();
}

function getToken(): string {
  const t = process.env.BORUSSIA_AIRTABLE_TOKEN;
  if (!t) throw new Error("BORUSSIA_AIRTABLE_TOKEN not set");
  return t;
}

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

interface AirtableRecord { id: string; fields: Record<string, unknown>; }
interface ListResponse   { records: AirtableRecord[]; offset?: string; }

async function listAllRecords(tableId: string, fields?: string[]): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    if (fields) fields.forEach(f => params.append("fields[]", f));
    const qs  = params.toString() ? `?${params.toString()}` : "";
    const res = await atFetch(`/${BASE_ID}/${tableId}${qs}`);
    if (!res.ok) { console.error(`listAll ${tableId} failed: ${res.status}`); break; }
    const data = await res.json() as ListResponse;
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);
  return records;
}

async function upsertByField(
  tableId: string,
  field: string,
  value: string,
  fields: Record<string, unknown>,
): Promise<{ id: string; created: boolean; action: string }> {
  const formula = `{${field}} = "${value.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const searchRes = await atFetch(`/${BASE_ID}/${tableId}?${params.toString()}`);
  if (searchRes.ok) {
    const data = await searchRes.json() as ListResponse;
    if (data.records?.length) {
      const existing = data.records[0];
      const patchRes = await atFetch(`/${BASE_ID}/${tableId}/${existing.id}`, {
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
    throw new Error(`create failed ${createRes.status}: ${text}`);
  }
  const record = await createRes.json() as AirtableRecord;
  return { id: record.id, created: true, action: "created" };
}

// ── Specimen → Airtable field map ─────────────────────────────────────────────

function specimenToFields(s: Specimen): Record<string, unknown> {
  return {
    id:               s.id,
    name:             s.name,
    description:      s.description,
    locality:         s.locality,
    crystal_system:   s.crystalSystem,
    dimensions:       s.dimensions,
    availability:     s.availability,
    publish_status:   s.publishStatus ?? "draft",
    ...(s.price !== undefined ? { price: s.price } : {}),
    ...(s.weight            ? { weight: s.weight } : {}),
    ...(s.mineralGroup      ? { mineral_group: s.mineralGroup } : {}),
    ...(s.luster            ? { luster: s.luster } : {}),
    ...(s.transparency      ? { transparency: s.transparency } : {}),
    ...(s.provenance        ? { provenance: s.provenance } : {}),
    ...(s.hardness          ? { hardness: s.hardness } : {}),
    ...(s.sizeClass         ? { size_class: s.sizeClass } : {}),
    ...(s.narrative         ? { narrative: s.narrative } : {}),
    ...(s.tier              ? { tier: s.tier } : {}),
    ...(s.featured          ? { featured: s.featured } : {}),
    ...(s.splatUrl          ? { splat_url: s.splatUrl } : {}),
    ...(s.splatCamera ? {
      splat_camera_position: JSON.stringify(s.splatCamera.position),
      splat_camera_look_at:  JSON.stringify(s.splatCamera.lookAt),
    } : {}),
  };
}

function mineToFields(m: Mine): Record<string, unknown> {
  return {
    slug:              m.slug,
    name:              m.name,
    location:          m.location,
    short_description: m.shortDescription,
    history:           m.history,
    geology:           m.geology,
    ...(m.established ? { established: m.established } : {}),
    ...(m.minerals?.length ? { minerals: m.minerals } : {}),
  };
}

// ── Diff helper ────────────────────────────────────────────────────────────────

async function runDiff(specimens: Specimen[], mines: Mine[]): Promise<void> {
  console.log("\n[diff] Fetching current Airtable state…");
  const existingSpecimens = await listAllRecords(TABLE_SPECIMENS, ["id", "name"]);
  const existingMines     = await listAllRecords(TABLE_MINES,     ["slug", "name"]);

  const existingSlugSet = new Set(existingSpecimens.map(r => String(r.fields.id ?? "")));
  const incomingSlugSet = new Set(specimens.map(s => s.id));

  const additions = specimens.filter(s => !existingSlugSet.has(s.id));
  const removals  = [...existingSlugSet].filter(slug => !incomingSlugSet.has(slug));

  const existingMineSlugSet = new Set(existingMines.map(r => String(r.fields.slug ?? "")));
  const incomingMineSlugSet = new Set(mines.map(m => m.slug));
  const mineAdditions = mines.filter(m => !existingMineSlugSet.has(m.slug));
  const mineRemovals  = [...existingMineSlugSet].filter(slug => !incomingMineSlugSet.has(slug));

  console.log(`\nSpecimens: +${additions.length} additions, -${removals.length} removals`);
  if (additions.length) console.log("  + would add:", additions.map(s => s.id).join(", "));
  if (removals.length)  console.log("  - would remove (manual):", removals.join(", "));

  console.log(`\nMines: +${mineAdditions.length} additions, -${mineRemovals.length} removals`);
  if (mineAdditions.length) console.log("  + would add:", mineAdditions.map(m => m.slug).join(", "));
  if (mineRemovals.length)  console.log("  - would remove (manual):", mineRemovals.join(", "));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Load sources
  console.log("[migrate] Loading static specimens…");
  const staticSpecimens = await loadStaticSpecimens();
  console.log(`[migrate] Static: ${staticSpecimens.length} specimens`);

  console.log("[migrate] Loading Google Sheets specimens…");
  const sheetsSpecimens = await loadSheetsSpecimens();
  console.log(`[migrate] Sheets: ${sheetsSpecimens.length} specimens`);

  const merged = mergeSpecimens(staticSpecimens, sheetsSpecimens);
  console.log(`[migrate] Merged (deduped by id): ${merged.length} specimens`);

  const mines = await loadStaticMines();
  console.log(`[migrate] Static: ${mines.length} mines`);

  // Extract unique localities from specimens
  const localityNames = [...new Set(merged.map(s => s.locality).filter(Boolean))];
  console.log(`[migrate] Unique localities: ${localityNames.length}`);

  // Extract unique mine slugs referenced in specimens
  const mineSlugsFromSpecimens = [...new Set(merged.map(s => s.mineSlug).filter(Boolean) as string[])];

  if (DRY_RUN) {
    const preview = {
      mode: "dry-run",
      timestamp: new Date().toISOString(),
      specimens: {
        total: merged.length,
        ids: merged.map(s => s.id),
        sample: merged.slice(0, 3).map(specimenToFields),
      },
      mines: {
        total: mines.length,
        slugs: mines.map(m => m.slug),
        fromSpecimens: mineSlugsFromSpecimens,
      },
      localities: {
        total: localityNames.length,
        names: localityNames,
      },
    };

    const outPath = "/tmp/airtable-migration-preview.json";
    writeFileSync(outPath, JSON.stringify(preview, null, 2));
    console.log(`\n[dry-run] Preview written to ${outPath}`);
    console.log(`  ${merged.length} specimens, ${mines.length} mines, ${localityNames.length} localities`);
    console.log("  Run with --commit to execute, --diff to compare against current Airtable state.");
    return;
  }

  if (DIFF) {
    await runDiff(merged, mines);
    return;
  }

  // ── COMMIT mode ────────────────────────────────────────────────────────────

  // Phase 1: Pre-create Mines
  console.log("\n[commit] Phase 1: Upserting mines…");
  const mineIdMap = new Map<string, string>(); // slug → airtable record ID
  for (const mine of mines) {
    const result = await upsertByField(TABLE_MINES, "slug", mine.slug, mineToFields(mine));
    mineIdMap.set(mine.slug, result.id);
    console.log(`  mine ${mine.slug}: ${result.action}`);
  }

  // Phase 2: Pre-create Localities
  console.log("\n[commit] Phase 2: Upserting localities…");
  const localityIdMap = new Map<string, string>(); // name → airtable record ID
  for (const name of localityNames) {
    const result = await upsertByField(TABLE_LOCALITIES, "name", name, { name });
    localityIdMap.set(name, result.id);
    console.log(`  locality "${name}": ${result.action}`);
  }

  // Phase 3: Upsert Specimens
  console.log("\n[commit] Phase 3: Upserting specimens…");
  let created = 0, updated = 0, failed = 0;

  for (const specimen of merged) {
    if (!specimen.id) { console.warn("  skipping specimen with no id:", specimen.name); continue; }

    const fields = specimenToFields(specimen);

    // Resolve linked record IDs
    if (specimen.mineSlug && mineIdMap.has(specimen.mineSlug)) {
      fields.mine = [mineIdMap.get(specimen.mineSlug)!];
    }
    if (specimen.locality && localityIdMap.has(specimen.locality)) {
      fields.locality = [localityIdMap.get(specimen.locality)!];
    }

    try {
      const result = await upsertByField(TABLE_SPECIMENS, "id", specimen.id, fields);
      if (result.created) { created++; } else { updated++; }
      console.log(`  specimen ${specimen.id}: ${result.action}`);
    } catch (err) {
      failed++;
      console.error(`  specimen ${specimen.id} FAILED:`, (err as Error).message);
    }
  }

  console.log(`\n[commit] Done.`);
  console.log(`  Specimens: ${created} created, ${updated} updated, ${failed} failed`);
  console.log(`  Mines:     ${mineIdMap.size} upserted`);
  console.log(`  Localities: ${localityIdMap.size} upserted`);
  console.log("\nRe-running --commit will produce 0 created, N updated (idempotent).");
}

main().catch(err => {
  console.error("[migrate] fatal:", err);
  process.exit(1);
});
