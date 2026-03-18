#!/usr/bin/env node
/**
 * upload-splats.mjs — Upload Gaussian Splat .ply files to Vercel Blob
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_xxx node scripts/upload-splats.mjs
 *   node scripts/upload-splats.mjs --dry-run   # list files without uploading
 *
 * Requires:
 *   BLOB_READ_WRITE_TOKEN in env or .env.local
 *
 * After running, copy the printed splatUrl values into specimen records
 * in src/data/specimens/.
 */

import { put } from "@vercel/blob";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = join(__dirname, "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0 && !line.startsWith("#")) {
      const k = line.slice(0, eqIdx).trim();
      const v = line.slice(eqIdx + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const DRY_RUN = process.argv.includes("--dry-run");
const LOCAL_DIR = process.env.LOCAL_SPLAT_DIR ?? "/tmp/borussia-splats";
const GUS_HOST = "gus@100.109.154.84";
const GUS_SPLAT_DIR = "/Users/gus/splat-projects";

// Map .ply filenames → specimen IDs
const SPLAT_SPECIMEN_MAP: Record<string, string> = {
  "crystal-cropped-15k.ply": "azur-001",
  "crystal-cropped-20k.ply": "azur-002",
  "cuprite-v2-colmap-30k.ply": "cupr-001",
  "cuprite-v2-dust3r-60-15k.ply": "cupr-002",
  "green-crystal-cropped-15k.ply": "chry-001",
};

async function pullFromGus(file: string, dst: string) {
  try {
    execFileSync("scp", [`${GUS_HOST}:${GUS_SPLAT_DIR}/${file}`, dst]);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !DRY_RUN) {
    console.error("ERROR: BLOB_READ_WRITE_TOKEN not set.");
    console.error("Get it: Vercel Dashboard → Storage → Blob → your store → .env.local");
    process.exit(1);
  }

  if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

  // Pull any missing files from GUS
  for (const file of Object.keys(SPLAT_SPECIMEN_MAP)) {
    const dst = join(LOCAL_DIR, file);
    if (!existsSync(dst)) {
      process.stdout.write(`Pulling ${file} from GUS... `);
      const ok = await pullFromGus(file, dst);
      console.log(ok ? "✓" : "✗ (not ready yet)");
    }
  }

  const ready = readdirSync(LOCAL_DIR).filter(f => f.endsWith(".ply"));
  if (ready.length === 0) {
    console.log("No .ply files available yet — splat jobs may still be running.");
    process.exit(0);
  }

  console.log(`\n${ready.length} file(s) ready:\n`);
  const results: Array<{ specimenId: string; url: string }> = [];

  for (const file of ready) {
    const specimenId = SPLAT_SPECIMEN_MAP[file];
    const filePath = join(LOCAL_DIR, file);
    const sizeMB = (readFileSync(filePath).length / 1024 / 1024).toFixed(1);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${file} (${sizeMB}MB) → ${specimenId ?? "unmapped"}`);
      continue;
    }

    if (!specimenId) {
      console.warn(`  SKIP ${file} — not in SPLAT_SPECIMEN_MAP`);
      continue;
    }

    process.stdout.write(`  Uploading ${file} (${sizeMB}MB)... `);
    const blob = await put(`borussia-splats/${file}`, readFileSync(filePath), {
      access: "public",
      contentType: "application/octet-stream",
    });
    console.log(`✓`);
    results.push({ specimenId, url: blob.url });
  }

  if (results.length > 0) {
    console.log("\n--- splatUrl values to add to specimen records ---");
    for (const { specimenId, url } of results) {
      console.log(`  ${specimenId}:  splatUrl: "${url}",`);
    }
    console.log("\nThen on each specimen page, render:");
    console.log("  {specimen.splatUrl && <SpecimenSplatViewer splatUrl={specimen.splatUrl} />}");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
