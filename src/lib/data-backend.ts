/**
 * Feature-flag router between Google Sheets and Airtable backends.
 *
 * Set USE_AIRTABLE_BACKEND=true to switch all reads/writes to Airtable.
 * Default (false) preserves the existing Google Sheets behaviour.
 *
 * Both backends must expose identical signatures. Functions present in
 * one backend but absent in the other are NOT re-exported here to avoid
 * breaking the sheets backend.
 */

import * as sheets   from "@/lib/google-sheets";
import * as airtable from "@/lib/airtable";

const useAirtable = process.env.USE_AIRTABLE_BACKEND === "true";

// ── Shared surface (exported by both backends) ────────────────────────────────

export const fetchAllSpecimens  = useAirtable ? airtable.fetchAllSpecimens  : sheets.fetchAllSpecimens;
export const fetchSpecimens     = useAirtable ? airtable.fetchSpecimens     : sheets.fetchSpecimens;
export const markSpecimensAsSold = useAirtable ? airtable.markSpecimensAsSold : sheets.markSpecimensAsSold;

// fetchSpecimenById: google-sheets returns `Specimen | undefined`, airtable returns `Specimen | null`.
// Normalise to `Specimen | null` for callers using this router.
export async function fetchSpecimenById(id: string): Promise<import("@/types").Specimen | null> {
  if (useAirtable) {
    return airtable.fetchSpecimenById(id);
  }
  const result = await sheets.fetchSpecimenById(id);
  return result ?? null;
}

// ── Google Sheets-only extras ─────────────────────────────────────────────────
// updateSpecimenField: patches a single field on a specimen row by Specimen key.
// Not wired through the Airtable path — callers must use @/lib/airtable directly
// when USE_AIRTABLE_BACKEND=true.
export const updateSpecimenField = sheets.updateSpecimenField;

// ── Airtable-only extras (only available when flag is on) ─────────────────────
// Callers that need these should import from @/lib/airtable directly.
// They are not re-exported here because google-sheets.ts does not implement them.
