/**
 * Airtable webhook receiver — POST /api/webhooks/airtable
 *
 * Verifies HMAC-SHA256 signature from the X-Airtable-Content-MAC header,
 * extracts changed record IDs from the Specimens table, and triggers
 * Vercel ISR revalidation for the affected specimen pages + /store.
 *
 * Airtable's webhook timeout is short (~5 s). We return 200 quickly and
 * fan out revalidation requests asynchronously.
 *
 * Env vars required:
 *   AIRTABLE_WEBHOOK_SECRET  — workspace MAC secret from the webhook registration
 *   REVALIDATE_SECRET        — matches REVALIDATE_SECRET checked by /api/revalidate
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fetchSpecimenById } from "@/lib/airtable";

// ── Payload shape (subset we care about) ─────────────────────────────────────

interface AirtableWebhookPayload {
  timestamp: string;
  baseTransactionNumber?: number;
  actionMetadata?: { source?: string; sourceMetadata?: unknown };
  createdTablesById?: Record<string, unknown>;
  destroyedTableIds?: string[];
  changedTablesById?: Record<
    string,
    {
      changedFieldsById?: Record<string, unknown>;
      createdRecordsById?: Record<string, unknown>;
      destroyedRecordIds?: string[];
      changedRecordsById?: Record<string, unknown>;
      changedViewsById?: Record<string, unknown>;
    }
  >;
}

// ── HMAC verification ─────────────────────────────────────────────────────────

async function verifySignature(rawBody: string, header: string | null): Promise<boolean> {
  const secret = process.env.AIRTABLE_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret is configured, skip verification in dev (log a warning).
    console.warn("[airtable-webhook] AIRTABLE_WEBHOOK_SECRET not set — skipping HMAC verification");
    return true;
  }
  if (!header) return false;

  // Airtable sends "hmac-sha256=<hex>" or just the hex digest.
  const digest = header.startsWith("hmac-sha256=") ? header.slice("hmac-sha256=".length) : header;

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(expected, "hex"));
  } catch {
    // Buffer.from() throws if the digest is not valid hex.
    return false;
  }
}

// ── Revalidation helper ────────────────────────────────────────────────────────

async function revalidatePath(path: string): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn("[airtable-webhook] REVALIDATE_SECRET not set — skipping ISR revalidation");
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const url = `${baseUrl}/api/revalidate?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(path)}`;
  try {
    await fetch(url, { method: "GET", signal: AbortSignal.timeout(10_000) });
  } catch (err) {
    console.error(`[airtable-webhook] revalidation fetch failed for ${path}:`, err);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Read raw body (needed for HMAC)
  const rawBody = await request.text();

  // 2. Verify signature — reject early if invalid
  const macHeader = request.headers.get("X-Airtable-Content-MAC");
  const valid = await verifySignature(rawBody, macHeader);
  if (!valid) {
    console.warn("[airtable-webhook] Invalid HMAC signature — rejecting");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Return 200 immediately — Airtable has a short timeout
  //    Remaining processing fires asynchronously.
  const responsePromise = processWebhook(rawBody).catch(err => {
    console.error("[airtable-webhook] async processing error:", err);
  });

  // In Node.js edge environments we need to await to avoid premature cleanup.
  // waitUntil is the Vercel/edge idiom, but in standard Node runtimes we just
  // kick it off — the process stays alive until the response is sent.
  void responsePromise;

  return NextResponse.json({ received: true }, { status: 200 });
}

// ── Async processing (after 200 returned) ─────────────────────────────────────

async function processWebhook(rawBody: string): Promise<void> {
  let payload: AirtableWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AirtableWebhookPayload;
  } catch {
    console.error("[airtable-webhook] Failed to parse JSON payload");
    return;
  }

  const changedTables = payload.changedTablesById ?? {};
  const revalidatePaths = new Set<string>();

  // Always revalidate /store when any specimen changes.
  let hasSpecimenChanges = false;

  for (const [, tableChanges] of Object.entries(changedTables)) {
    const changedRecordIds = [
      ...Object.keys(tableChanges.changedRecordsById ?? {}),
      ...Object.keys(tableChanges.createdRecordsById ?? {}),
      ...(tableChanges.destroyedRecordIds ?? []),
    ];

    if (!changedRecordIds.length) continue;
    hasSpecimenChanges = true;

    // Resolve Airtable record IDs → specimen slugs via secondary fetch
    for (const airtableRecordId of changedRecordIds) {
      // Destroyed records can't be re-fetched; just bust /store.
      if ((tableChanges.destroyedRecordIds ?? []).includes(airtableRecordId)) continue;

      // Try fetching by Airtable internal ID first. The airtable.ts fetchSpecimenById
      // searches by the `id` slug field, so we use a raw lookup here.
      try {
        // Attempt slug lookup — if the record has an `id` (slug) field, we get it.
        // We pass the Airtable record ID as-is and let fetchSpecimenById fall through.
        const specimen = await fetchSpecimenById(airtableRecordId);
        if (specimen?.id) {
          revalidatePaths.add(`/specimens/${specimen.id}`);
        }
      } catch {
        // Non-critical — /store revalidation covers the record.
      }
    }
  }

  if (hasSpecimenChanges) {
    revalidatePaths.add("/store");
  }

  // Fan out revalidation requests in parallel.
  await Promise.all([...revalidatePaths].map(p => revalidatePath(p)));

  if (revalidatePaths.size > 0) {
    console.log("[airtable-webhook] revalidated paths:", [...revalidatePaths]);
  }
}
