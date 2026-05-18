/**
 * One-off patch: correct specimen localities per physical info card audit (2026-05-18).
 *
 *   chry-001: "Bisbee, Cochise County, AZ" → "Bagdad, Yavapai County, Arizona, USA"
 *             Cards: Borussia info card + collector tag #912 both confirm Bagdad.
 *             Sheet had drifted from the physical card. Cards win.
 *
 *   cupr-001: Add "Mineral Creek District" per card text.
 *             Inserts the district into the existing locality string.
 *
 * Usage:
 *   bun scripts/patch-specimen-localities-2026-05-18.ts          # dry-run (default)
 *   bun scripts/patch-specimen-localities-2026-05-18.ts --commit  # live write
 *
 * Idempotent: safe to re-run — if values already match, no write is issued.
 *
 * Authority: physical specimen cards = canonical. Sheet mirrors cards.
 * Source: /tmp/borussia-card-audit-2026-05-18.md
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { fetchAllSpecimens, updateSpecimenField } from "@/lib/google-sheets";

const COMMIT = process.argv.includes("--commit");

// ── Patch definitions ─────────────────────────────────────────────────────────

interface Patch {
  specimenId: string;
  field: "locality";
  /** Static value to write, OR a function that derives the new value from the current one. */
  newValue: string | ((current: string) => string);
  /** Human-readable reason for the change. */
  reason: string;
}

const PATCHES: Patch[] = [
  {
    specimenId: "chry-001",
    field: "locality",
    newValue: "Bagdad, Yavapai County, Arizona, USA",
    reason:
      "Physical info cards (Borussia card + collector tag #912) both confirm Bagdad, Yavapai County. Sheet had 'Bisbee, Cochise County, Arizona, USA' which is a different mine in a different county.",
  },
  {
    specimenId: "cupr-001",
    field: "locality",
    newValue: (current: string) => {
      // Insert "Mineral Creek District" before "Pinal County" if not already present.
      if (current.includes("Mineral Creek District")) {
        return current; // already there — idempotent
      }
      // Pattern: "..., Pinal County, ..." → "..., Mineral Creek District, Pinal County, ..."
      if (current.includes("Pinal County")) {
        return current.replace("Pinal County", "Mineral Creek District, Pinal County");
      }
      // Fallback: append district to end of string
      return current.trim() + ", Mineral Creek District";
    },
    reason:
      "Physical info card includes 'Mineral Creek District' detail not present in Sheet locality string.",
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!COMMIT) {
    console.log("DRY-RUN mode. Pass --commit to apply changes.\n");
  } else {
    console.log("COMMIT mode — changes will be written to Google Sheet.\n");
  }

  // Fetch current state for all specimens once
  const all = await fetchAllSpecimens();
  const specimenMap = new Map(all.map((s) => [s.id, s]));

  let pendingWrites = 0;

  for (const patch of PATCHES) {
    const specimen = specimenMap.get(patch.specimenId);
    if (!specimen) {
      console.error(`  ERROR: ${patch.specimenId} not found in sheet — aborting.`);
      process.exit(1);
    }

    const current = specimen[patch.field] ?? "";
    const desired =
      typeof patch.newValue === "function"
        ? patch.newValue(current)
        : patch.newValue;

    if (current === desired) {
      console.log(`  SKIP ${patch.specimenId}.${patch.field} — already correct: "${current}"`);
      continue;
    }

    console.log(`  PATCH ${patch.specimenId}.${patch.field}`);
    console.log(`    FROM: "${current}"`);
    console.log(`    TO:   "${desired}"`);
    console.log(`    WHY:  ${patch.reason}`);
    console.log();

    if (COMMIT) {
      await updateSpecimenField(patch.specimenId, patch.field, desired);
      console.log(`    WRITTEN ✓`);
    }

    pendingWrites++;
  }

  if (!COMMIT) {
    if (pendingWrites > 0) {
      console.log(`\n${pendingWrites} patch(es) would be applied. Re-run with --commit to write.`);
    } else {
      console.log("\nAll values already correct. Nothing to write.");
    }
  } else {
    console.log(`\nDone. ${pendingWrites} patch(es) applied.`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
