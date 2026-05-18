/**
 * Borussia Minerals — Airtable data layer
 *
 * Drop-in replacement for src/lib/google-sheets.ts. Exports the same function
 * surface so callers can switch via the data-backend.ts router.
 *
 * Credential isolation: BORUSSIA_AIRTABLE_TOKEN + BORUSSIA_AIRTABLE_BASE_ID are
 * scoped to this project ONLY (rule_project_credential_isolation).
 * Env vars are read lazily — import never throws; first call throws if missing.
 */

import type Stripe from "stripe";
import type { Specimen, Mine, FilterOptions } from "@/types";

// ── Table IDs (verbatim from Director spec) ────────────────────────────────────

const TABLE_SPECIMENS  = "tblovCHa4wKP6ZGnz";
const TABLE_MINES      = "tblRv7YtauWwI8Vi6";
const TABLE_LOCALITIES = "tblGdYctcj3nLFBnw";
const TABLE_CUSTOMERS  = "tblEcDC9n3IfHClxG";
const TABLE_ORDERS     = "tblNRNNmojQ8ixlGx";

export { TABLE_SPECIMENS, TABLE_MINES, TABLE_LOCALITIES, TABLE_CUSTOMERS, TABLE_ORDERS };

// ── Order / status types ───────────────────────────────────────────────────────

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "refunded" | "cancelled";

export interface Order {
  id?: string;
  stripeSessionId: string;
  stripePaymentIntent?: string;
  customerEmail: string;
  customerName?: string;
  shippingAddress?: string;
  totalCents?: number;
  currency?: string;
  status: OrderStatus;
  paidAt?: string;
  shippedAt?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  notes?: string;
  specimenIds?: string[];
  customerId?: string;
}

// ── Env helpers (lazy read — throws at first call if missing) ─────────────────

function getToken(): string {
  const t = process.env.BORUSSIA_AIRTABLE_TOKEN;
  if (!t) {
    throw new Error(
      "[airtable] BORUSSIA_AIRTABLE_TOKEN is not set. " +
      "Generate a base-scoped PAT at https://airtable.com/create/tokens and " +
      "add it to .env.local as BORUSSIA_AIRTABLE_TOKEN=pat..."
    );
  }
  return t;
}

function getBaseId(): string {
  const b = process.env.BORUSSIA_AIRTABLE_BASE_ID ?? "appOBaUxz1Qmtjz4H";
  return b;
}

// ── Rate limiter — token bucket at 5 req/sec/base ────────────────────────────

const RATE_LIMIT   = 5;
const WINDOW_MS    = 1_000;
const buckets      = new Map<string, { tokens: number; refilledAt: number }>();

async function rateLimit(baseId: string): Promise<void> {
  const now    = Date.now();
  let   bucket = buckets.get(baseId);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT, refilledAt: now };
    buckets.set(baseId, bucket);
  }
  const elapsed = now - bucket.refilledAt;
  if (elapsed >= WINDOW_MS) {
    bucket.tokens    = RATE_LIMIT;
    bucket.refilledAt = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return;
  }
  const waitMs = WINDOW_MS - elapsed;
  await new Promise(res => setTimeout(res, waitMs));
  bucket.tokens    = RATE_LIMIT - 1;
  bucket.refilledAt = Date.now();
}

// ── Core fetch ────────────────────────────────────────────────────────────────

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface ListResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function atFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseId = getBaseId();
  await rateLimit(baseId);

  const token   = getToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined ?? {}),
  };

  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
    await new Promise(r => setTimeout(r, retryAfter * 1_000));
    await rateLimit(baseId);
    return fetch(`https://api.airtable.com/v0${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  }

  return res;
}

/** Fetch all pages from a table, honoring offset-based pagination. */
async function listAll(
  tableId: string,
  params: URLSearchParams = new URLSearchParams(),
): Promise<AirtableRecord[]> {
  const baseId  = getBaseId();
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const qs = new URLSearchParams(params);
    if (offset) qs.set("offset", offset);
    const qs_str = qs.toString() ? `?${qs.toString()}` : "";

    const res = await atFetch(`/${baseId}/${tableId}${qs_str}`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[airtable] listAll ${tableId} failed: ${res.status} ${text}`);
      break;
    }
    const data = await res.json() as ListResponse;
    records.push(...(data.records ?? []));
    offset = data.offset;
  } while (offset);

  return records;
}

// ── In-memory cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> { value: T; expiresAt: number; }
const _cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60_000; // 60 s

function cacheGet<T>(key: string): T | undefined {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return undefined; }
  return entry.value as T;
}
function cacheSet<T>(key: string, value: T): void {
  _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}
function cacheBust(prefix?: string): void {
  if (!prefix) { _cache.clear(); return; }
  for (const k of _cache.keys()) {
    if (k.startsWith(prefix)) _cache.delete(k);
  }
}

/** Exposed for testing only — clears the entire in-memory cache. */
export function _clearCacheForTesting(): void {
  _cache.clear();
}

// ── Field mappers ─────────────────────────────────────────────────────────────

function str(v: unknown): string  { return typeof v === "string" ? v : ""; }
function num(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? undefined : n; }
  return undefined;
}
function bool(v: unknown): boolean { return v === true || v === 1; }
function strOpt(v: unknown): string | undefined { return typeof v === "string" && v ? v : undefined; }

/** Airtable attachment shape */
interface AirtableAttachment { url: string; filename?: string; }

function attachmentUrls(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as AirtableAttachment[]).map(a => a.url).filter(Boolean);
}

function parseJsonField(v: unknown): [number, number, number] | null {
  if (typeof v !== "string" || !v) return null;
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed) && parsed.length === 3) {
      return parsed as [number, number, number];
    }
  } catch { /* fall through */ }
  return null;
}

/** Linked-record fields come back as string arrays of record IDs from Airtable.
 *  We store the first ID; resolution to a slug happens via secondary fetch when needed. */
function linkedId(v: unknown): string | undefined {
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
  return undefined;
}

export function mapRowToSpecimen(record: AirtableRecord): Specimen {
  const f = record.fields;
  const attachments = attachmentUrls(f.image ?? f.images);
  const allImages   = attachmentUrls(f.images);

  const position = parseJsonField(f.splat_camera_position);
  const lookAt   = parseJsonField(f.splat_camera_look_at);

  const availability = (str(f.availability) || "available") as Specimen["availability"];

  return {
    id:            str(f.id) || record.id,
    name:          str(f.name),
    image:         attachments[0] ?? `/images/specimens/${str(f.id) || record.id}.jpg`,
    ...(allImages.length > 1 ? { images: allImages } : {}),
    locality:      str(f.locality),
    crystalSystem: str(f.crystal_system),
    dimensions:    str(f.dimensions),
    description:   str(f.description),
    featured:      bool(f.featured) || undefined,
    price:         num(f.price),
    priceDisplay:  strOpt(f.price_display),
    availability,
    mineSlug:      strOpt(f.mine_slug) ?? linkedId(f.mine),
    weight:        strOpt(f.weight),
    mineralGroup:  strOpt(f.mineral_group),
    luster:        strOpt(f.luster),
    transparency:  strOpt(f.transparency),
    provenance:    strOpt(f.provenance),
    publishStatus: (str(f.publish_status) || "published") as Specimen["publishStatus"],
    hardness:      strOpt(f.hardness),
    sizeClass:     strOpt(f.size_class) as Specimen["sizeClass"],
    narrative:     strOpt(f.narrative),
    tier:          strOpt(f.tier) as Specimen["tier"],
    splatUrl:      strOpt(f.splat_url),
    ...(position && lookAt ? { splatCamera: { position, lookAt } } : {}),
  };
}

export function mapRowToMine(record: AirtableRecord): Mine {
  const f = record.fields;
  const heroAttachments = attachmentUrls(f.hero_image);
  const minerals = Array.isArray(f.minerals) ? (f.minerals as string[]) : [];
  return {
    slug:             str(f.slug) || record.id,
    name:             str(f.name),
    location:         str(f.location),
    shortDescription: str(f.short_description),
    history:          str(f.history),
    geology:          str(f.geology),
    heroImage:        heroAttachments[0],
    established:      strOpt(f.established),
    minerals:         minerals.length ? minerals : undefined,
  };
}

export function mapRowToOrder(record: AirtableRecord): Order {
  const f = record.fields;
  const specimenLinks = Array.isArray(f.specimens_purchased)
    ? (f.specimens_purchased as string[])
    : [];
  return {
    id:                  record.id,
    stripeSessionId:     str(f.stripe_session_id),
    stripePaymentIntent: strOpt(f.stripe_payment_intent),
    customerEmail:       str(f.customer_email),
    customerName:        strOpt(f.customer_name),
    shippingAddress:     strOpt(f.shipping_address),
    totalCents:          num(f.total_cents),
    currency:            strOpt(f.currency) ?? "USD",
    status:              (str(f.status) || "pending") as OrderStatus,
    paidAt:              strOpt(f.paid_at),
    shippedAt:           strOpt(f.shipped_at),
    trackingNumber:      strOpt(f.tracking_number),
    trackingCarrier:     strOpt(f.tracking_carrier),
    notes:               strOpt(f.notes),
    specimenIds:         specimenLinks,
    customerId:          linkedId(f.customer),
  };
}

// ── Upsert helper (search by field, create or update) ────────────────────────

interface UpsertResult { id: string; created: boolean; }

async function upsertRecord(
  tableId: string,
  matchField: string,
  matchValue: string,
  fields: Record<string, unknown>,
): Promise<UpsertResult> {
  const baseId = getBaseId();
  const formula = `{${matchField}} = "${matchValue.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const qs      = `?${params.toString()}`;

  const searchRes = await atFetch(`/${baseId}/${tableId}${qs}`);
  if (searchRes.ok) {
    const data = await searchRes.json() as ListResponse;
    if (data.records?.length) {
      // Update existing
      const existing = data.records[0];
      const patchRes = await atFetch(`/${baseId}/${tableId}/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
      if (patchRes.ok) {
        return { id: existing.id, created: false };
      }
    }
  }

  // Create new
  const createRes = await atFetch(`/${baseId}/${tableId}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`[airtable] upsert create failed ${createRes.status}: ${text}`);
  }
  const created = await createRes.json() as AirtableRecord;
  return { id: created.id, created: true };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fetch ALL specimens (ignores publish_status). */
export async function fetchAllSpecimens(): Promise<Specimen[]> {
  const key = "specimens:all";
  const hit = cacheGet<Specimen[]>(key);
  if (hit) return hit;

  const records = await listAll(TABLE_SPECIMENS);
  const result  = records.map(mapRowToSpecimen);
  cacheSet(key, result);
  return result;
}

/** Fetch published specimens, optionally filtered. */
export async function fetchSpecimens(filter?: FilterOptions): Promise<Specimen[]> {
  const all = await fetchAllSpecimens();
  let results = all.filter(s => s.publishStatus === "published");

  if (filter) {
    if (filter.mineSlug)    results = results.filter(s => s.mineSlug === filter.mineSlug);
    if (filter.crystalSystem) results = results.filter(s => s.crystalSystem === filter.crystalSystem);
    if (filter.mineralGroup)  results = results.filter(s => s.mineralGroup === filter.mineralGroup);
    if (filter.availability)  results = results.filter(s => s.availability === filter.availability);
    if (filter.maxPrice !== undefined) results = results.filter(s => s.price !== undefined && s.price <= filter.maxPrice!);
    if (filter.minPrice !== undefined) results = results.filter(s => s.price !== undefined && s.price >= filter.minPrice!);
  }
  return results;
}

/** Fetch a single published specimen by slug (the `id` field in Airtable). */
export async function fetchSpecimenById(id: string): Promise<Specimen | null> {
  const cacheKey = `specimen:${id}`;
  const hit = cacheGet<Specimen>(cacheKey);
  if (hit) return hit;

  const baseId  = getBaseId();
  const formula = `{id} = "${id.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const res     = await atFetch(`/${baseId}/${TABLE_SPECIMENS}?${params.toString()}`);

  if (!res.ok) return null;
  const data = await res.json() as ListResponse;
  if (!data.records?.length) return null;

  const specimen = mapRowToSpecimen(data.records[0]);
  cacheSet(cacheKey, specimen);
  return specimen;
}

/**
 * Mark specimens as sold by their slug `id` field.
 * Finds each record, patches availability=sold + sold_at=now, busts cache.
 */
export async function markSpecimensAsSold(specimenIds: string[]): Promise<void> {
  if (!specimenIds.length) return;

  const baseId = getBaseId();
  const now    = new Date().toISOString();

  for (const specimenId of specimenIds) {
    const formula = `{id} = "${specimenId.replace(/"/g, '\\"')}"`;
    const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
    const searchRes = await atFetch(`/${baseId}/${TABLE_SPECIMENS}?${params.toString()}`);

    if (!searchRes.ok) {
      console.warn(`[airtable] markSpecimensAsSold: search failed for ${specimenId}`);
      continue;
    }
    const data = await searchRes.json() as ListResponse;
    if (!data.records?.length) {
      console.warn(`[airtable] markSpecimensAsSold: specimen ${specimenId} not found`);
      continue;
    }

    const recordId = data.records[0].id;
    const patchRes = await atFetch(`/${baseId}/${TABLE_SPECIMENS}/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          availability: "sold",
          sold_at: now,
        },
      }),
    });

    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => "");
      console.error(`[airtable] markSpecimensAsSold: patch failed for ${specimenId}: ${patchRes.status} ${text}`);
    }
  }

  cacheBust("specimen");
  cacheBust("specimens:");
}

/** Create a new specimen record. Returns the created specimen. */
export async function createSpecimen(input: Omit<Specimen, "id">): Promise<Specimen> {
  const baseId = getBaseId();
  const fields: Record<string, unknown> = {
    name:             input.name,
    description:      input.description,
    locality:         input.locality,
    crystal_system:   input.crystalSystem,
    dimensions:       input.dimensions,
    availability:     input.availability,
    publish_status:   input.publishStatus ?? "draft",
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.weight ? { weight: input.weight } : {}),
    ...(input.mineralGroup ? { mineral_group: input.mineralGroup } : {}),
    ...(input.luster ? { luster: input.luster } : {}),
    ...(input.transparency ? { transparency: input.transparency } : {}),
    ...(input.provenance ? { provenance: input.provenance } : {}),
    ...(input.hardness ? { hardness: input.hardness } : {}),
    ...(input.sizeClass ? { size_class: input.sizeClass } : {}),
    ...(input.narrative ? { narrative: input.narrative } : {}),
    ...(input.tier ? { tier: input.tier } : {}),
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.splatUrl ? { splat_url: input.splatUrl } : {}),
    ...(input.splatCamera ? {
      splat_camera_position: JSON.stringify(input.splatCamera.position),
      splat_camera_look_at:  JSON.stringify(input.splatCamera.lookAt),
    } : {}),
  };

  const res = await atFetch(`/${baseId}/${TABLE_SPECIMENS}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[airtable] createSpecimen failed ${res.status}: ${text}`);
  }

  const record = await res.json() as AirtableRecord;
  cacheBust("specimens:");
  return mapRowToSpecimen(record);
}

/** Patch an existing specimen by its `id` slug field. Returns updated specimen. */
export async function updateSpecimen(id: string, patch: Partial<Specimen>): Promise<Specimen> {
  const baseId  = getBaseId();
  const formula = `{id} = "${id.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const searchRes = await atFetch(`/${baseId}/${TABLE_SPECIMENS}?${params.toString()}`);

  if (!searchRes.ok) throw new Error(`[airtable] updateSpecimen: search failed for ${id}`);
  const data = await searchRes.json() as ListResponse;
  if (!data.records?.length) throw new Error(`[airtable] updateSpecimen: specimen ${id} not found`);

  const recordId = data.records[0].id;
  const fields: Record<string, unknown> = {};
  if (patch.name !== undefined)          fields.name             = patch.name;
  if (patch.description !== undefined)   fields.description      = patch.description;
  if (patch.locality !== undefined)      fields.locality         = patch.locality;
  if (patch.crystalSystem !== undefined) fields.crystal_system   = patch.crystalSystem;
  if (patch.dimensions !== undefined)    fields.dimensions       = patch.dimensions;
  if (patch.availability !== undefined)  fields.availability     = patch.availability;
  if (patch.publishStatus !== undefined) fields.publish_status   = patch.publishStatus;
  if (patch.price !== undefined)         fields.price            = patch.price;
  if (patch.weight !== undefined)        fields.weight           = patch.weight;
  if (patch.mineralGroup !== undefined)  fields.mineral_group    = patch.mineralGroup;
  if (patch.luster !== undefined)        fields.luster           = patch.luster;
  if (patch.transparency !== undefined)  fields.transparency     = patch.transparency;
  if (patch.provenance !== undefined)    fields.provenance       = patch.provenance;
  if (patch.hardness !== undefined)      fields.hardness         = patch.hardness;
  if (patch.sizeClass !== undefined)     fields.size_class       = patch.sizeClass;
  if (patch.narrative !== undefined)     fields.narrative        = patch.narrative;
  if (patch.tier !== undefined)          fields.tier             = patch.tier;
  if (patch.featured !== undefined)      fields.featured         = patch.featured;
  if (patch.splatUrl !== undefined)      fields.splat_url        = patch.splatUrl;
  if (patch.splatCamera !== undefined) {
    fields.splat_camera_position = JSON.stringify(patch.splatCamera.position);
    fields.splat_camera_look_at  = JSON.stringify(patch.splatCamera.lookAt);
  }

  const patchRes = await atFetch(`/${baseId}/${TABLE_SPECIMENS}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    throw new Error(`[airtable] updateSpecimen patch failed ${patchRes.status}: ${text}`);
  }

  const updated = await patchRes.json() as AirtableRecord;
  cacheBust("specimen");
  cacheBust("specimens:");
  return mapRowToSpecimen(updated);
}

/** Fetch all mines. */
export async function fetchAllMines(): Promise<Mine[]> {
  const key = "mines:all";
  const hit = cacheGet<Mine[]>(key);
  if (hit) return hit;

  const records = await listAll(TABLE_MINES);
  const result  = records.map(mapRowToMine);
  cacheSet(key, result);
  return result;
}

/** Fetch mine by slug. */
export async function fetchMineBySlug(slug: string): Promise<Mine | null> {
  const cacheKey = `mine:${slug}`;
  const hit = cacheGet<Mine>(cacheKey);
  if (hit) return hit;

  const baseId  = getBaseId();
  const formula = `{slug} = "${slug.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const res     = await atFetch(`/${baseId}/${TABLE_MINES}?${params.toString()}`);

  if (!res.ok) return null;
  const data = await res.json() as ListResponse;
  if (!data.records?.length) return null;

  const mine = mapRowToMine(data.records[0]);
  cacheSet(cacheKey, mine);
  return mine;
}

/**
 * Create an Order row from a Stripe checkout.session.completed event.
 * Also resolves specimen record IDs for the linked `specimens_purchased` field.
 * Returns the Airtable record ID.
 */
export async function createOrder(
  stripeSession: Stripe.Checkout.Session,
): Promise<{ id: string }> {
  const baseId = getBaseId();

  const specimenIds: string[] = stripeSession.metadata?.specimen_ids
    ? stripeSession.metadata.specimen_ids.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  // Resolve slug → Airtable record IDs for the linked field
  const specimenRecordIds: string[] = [];
  for (const slug of specimenIds) {
    const formula   = `{id} = "${slug.replace(/"/g, '\\"')}"`;
    const params    = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
    const res       = await atFetch(`/${baseId}/${TABLE_SPECIMENS}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json() as ListResponse;
      if (data.records?.length) specimenRecordIds.push(data.records[0].id);
    }
  }

  // `collected_information.shipping_details` is the correct Stripe SDK field
  // for shipping address on a completed checkout session.
  const shippingInfo = stripeSession.collected_information?.shipping_details;
  const shippingAddr = shippingInfo
    ? JSON.stringify(shippingInfo, null, 2)
    : undefined;

  const fields: Record<string, unknown> = {
    stripe_session_id:     stripeSession.id,
    stripe_payment_intent: typeof stripeSession.payment_intent === "string"
      ? stripeSession.payment_intent
      : undefined,
    customer_email:   stripeSession.customer_details?.email ?? "",
    customer_name:    stripeSession.customer_details?.name  ?? "",
    total_cents:      stripeSession.amount_total ?? 0,
    currency:         (stripeSession.currency ?? "usd").toUpperCase(),
    status:           "paid",
    paid_at:          new Date().toISOString(),
    ...(shippingAddr ? { shipping_address: shippingAddr } : {}),
    ...(specimenRecordIds.length ? { specimens_purchased: specimenRecordIds } : {}),
  };

  const res = await atFetch(`/${baseId}/${TABLE_ORDERS}`, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[airtable] createOrder failed ${res.status}: ${text}`);
  }

  const record = await res.json() as AirtableRecord;
  return { id: record.id };
}

/**
 * Update an existing Order's status (and optional extra fields) by Stripe session ID.
 */
export async function updateOrderStatus(
  stripeSessionId: string,
  status: OrderStatus,
  extraFields?: Partial<Order>,
): Promise<void> {
  const baseId  = getBaseId();
  const formula = `{stripe_session_id} = "${stripeSessionId.replace(/"/g, '\\"')}"`;
  const params  = new URLSearchParams({ filterByFormula: formula, maxRecords: "1" });
  const searchRes = await atFetch(`/${baseId}/${TABLE_ORDERS}?${params.toString()}`);

  if (!searchRes.ok) {
    console.error(`[airtable] updateOrderStatus: search failed for ${stripeSessionId}`);
    return;
  }
  const data = await searchRes.json() as ListResponse;
  if (!data.records?.length) {
    console.warn(`[airtable] updateOrderStatus: no order found for session ${stripeSessionId}`);
    return;
  }

  const recordId = data.records[0].id;
  const fields: Record<string, unknown> = { status };
  if (extraFields?.shippedAt)       fields.shipped_at       = extraFields.shippedAt;
  if (extraFields?.trackingNumber)  fields.tracking_number  = extraFields.trackingNumber;
  if (extraFields?.trackingCarrier) fields.tracking_carrier = extraFields.trackingCarrier;
  if (extraFields?.notes)           fields.notes            = extraFields.notes;
  if (extraFields?.paidAt)          fields.paid_at          = extraFields.paidAt;

  const patchRes = await atFetch(`/${baseId}/${TABLE_ORDERS}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => "");
    console.error(`[airtable] updateOrderStatus patch failed ${patchRes.status}: ${text}`);
  }
}

/**
 * Upsert a Mine row by slug — used by the migration script.
 * Returns the Airtable record ID.
 */
export async function upsertMine(
  slug: string,
  fields: Record<string, unknown>,
): Promise<UpsertResult> {
  const result = await upsertRecord(TABLE_MINES, "slug", slug, { slug, ...fields });
  cacheBust("mines:");
  cacheBust(`mine:${slug}`);
  return result;
}

/**
 * Upsert a Locality row by name.
 * Returns the Airtable record ID.
 */
export async function upsertLocality(
  name: string,
  fields: Record<string, unknown>,
): Promise<UpsertResult> {
  return upsertRecord(TABLE_LOCALITIES, "name", name, { name, ...fields });
}
