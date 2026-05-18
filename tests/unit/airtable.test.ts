/**
 * Unit tests for src/lib/airtable.ts
 *
 * Strategy: mock global `fetch` entirely — no real HTTP calls, no real
 * credentials. GOV-052: BORUSSIA_AIRTABLE_TOKEN is a stub only.
 *
 * Tests:
 * 1. mapRowToSpecimen correctly maps an Airtable record stub → Specimen
 * 2. mapRowToOrder correctly maps a Stripe session stub → Order
 * 3. Cache busts on write (markSpecimensAsSold clears cached specimens)
 * 4. Missing BORUSSIA_AIRTABLE_TOKEN throws informative error at first call, not at import
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STUB_TOKEN = "patSTUBTOKEN.abc123";
const STUB_BASE  = "appOBaUxz1Qmtjz4H";

function setTokenEnv(value: string | undefined) {
  if (value === undefined) {
    delete process.env.BORUSSIA_AIRTABLE_TOKEN;
  } else {
    process.env.BORUSSIA_AIRTABLE_TOKEN = value;
  }
}

// ── Test 1: mapRowToSpecimen ──────────────────────────────────────────────────

describe("mapRowToSpecimen", () => {
  it("maps a full Airtable record stub to a Specimen", async () => {
    const { mapRowToSpecimen } = await import("@/lib/airtable");

    const record = {
      id: "recABC123",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        id:                    "azur-001",
        name:                  "Azurite with Selenite",
        image:                 [{ url: "https://example.com/azur-001.jpg", filename: "azur-001.jpg" }],
        images:                [
          { url: "https://example.com/azur-001.jpg" },
          { url: "https://example.com/azur-001b.jpg" },
        ],
        locality:              "Morenci Mine, Arizona",
        crystal_system:        "Monoclinic",
        dimensions:            "8.5 × 4.2 × 3.8 cm",
        description:           "Deep azure-blue botryoidal azurite",
        featured:              true,
        price:                 850,
        price_display:         "$850",
        availability:          "available",
        mine_slug:             "fat-jack",
        weight:                "320g",
        mineral_group:         "Carbonates",
        luster:                "Vitreous",
        transparency:          "Translucent",
        provenance:            "Old collection",
        publish_status:        "published",
        hardness:              "3.5–4",
        size_class:            "SC",
        narrative:             "Found in 1995",
        tier:                  "collector",
        splat_url:             "https://blob.vercel.com/crystal.ply",
        splat_camera_position: "[1.0, 2.0, 3.0]",
        splat_camera_look_at:  "[0.0, 0.0, 0.0]",
      },
    };

    const specimen = mapRowToSpecimen(record);

    expect(specimen.id).toBe("azur-001");
    expect(specimen.name).toBe("Azurite with Selenite");
    expect(specimen.image).toBe("https://example.com/azur-001.jpg");
    expect(specimen.images).toHaveLength(2);
    expect(specimen.locality).toBe("Morenci Mine, Arizona");
    expect(specimen.crystalSystem).toBe("Monoclinic");
    expect(specimen.dimensions).toBe("8.5 × 4.2 × 3.8 cm");
    expect(specimen.description).toBe("Deep azure-blue botryoidal azurite");
    expect(specimen.featured).toBe(true);
    expect(specimen.price).toBe(850);
    expect(specimen.priceDisplay).toBe("$850");
    expect(specimen.availability).toBe("available");
    expect(specimen.mineSlug).toBe("fat-jack");
    expect(specimen.weight).toBe("320g");
    expect(specimen.mineralGroup).toBe("Carbonates");
    expect(specimen.luster).toBe("Vitreous");
    expect(specimen.transparency).toBe("Translucent");
    expect(specimen.provenance).toBe("Old collection");
    expect(specimen.publishStatus).toBe("published");
    expect(specimen.hardness).toBe("3.5–4");
    expect(specimen.sizeClass).toBe("SC");
    expect(specimen.narrative).toBe("Found in 1995");
    expect(specimen.tier).toBe("collector");
    expect(specimen.splatUrl).toBe("https://blob.vercel.com/crystal.ply");
    expect(specimen.splatCamera).toEqual({
      position: [1.0, 2.0, 3.0],
      lookAt:   [0.0, 0.0, 0.0],
    });
  });

  it("falls back gracefully when optional fields are missing", async () => {
    const { mapRowToSpecimen } = await import("@/lib/airtable");

    const minimal = {
      id: "recMIN001",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        id:           "min-001",
        name:         "Minimal specimen",
        availability: "available",
        publish_status: "published",
      },
    };

    const specimen = mapRowToSpecimen(minimal);
    expect(specimen.id).toBe("min-001");
    expect(specimen.splatCamera).toBeUndefined();
    expect(specimen.tier).toBeUndefined();
    expect(specimen.image).toBe("/images/specimens/min-001.jpg"); // fallback local path
  });

  it("falls back to Airtable record ID when `id` field is empty", async () => {
    const { mapRowToSpecimen } = await import("@/lib/airtable");

    const record = {
      id: "recFALLBACK",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: { name: "No slug" },
    };

    const specimen = mapRowToSpecimen(record);
    expect(specimen.id).toBe("recFALLBACK");
  });

  it("handles malformed splat_camera JSON with null fallback", async () => {
    const { mapRowToSpecimen } = await import("@/lib/airtable");

    const record = {
      id: "recBADJSON",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        id:                    "bad-json",
        splat_camera_position: "NOT_VALID_JSON",
        splat_camera_look_at:  "[0, 0, 0]",
      },
    };

    const specimen = mapRowToSpecimen(record);
    // If either field fails parsing, splatCamera should not be set
    expect(specimen.splatCamera).toBeUndefined();
  });
});

// ── Test 2: mapRowToOrder ─────────────────────────────────────────────────────

describe("mapRowToOrder", () => {
  it("maps a Stripe session-derived Airtable record to an Order", async () => {
    const { mapRowToOrder } = await import("@/lib/airtable");

    const record = {
      id: "recORDER123",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: {
        stripe_session_id:     "cs_test_abc",
        stripe_payment_intent: "pi_test_xyz",
        customer_email:        "buyer@example.com",
        customer_name:         "Jane Buyer",
        shipping_address:      '{"city": "Tucson"}',
        total_cents:           85000,
        currency:              "USD",
        status:                "paid",
        paid_at:               "2026-01-01T12:00:00.000Z",
        tracking_number:       "1Z999AA10123456784",
        tracking_carrier:      "UPS",
        notes:                 "Handle with care",
        specimens_purchased:   ["recSPEC001", "recSPEC002"],
        customer:              ["recCUST001"],
      },
    };

    const order = mapRowToOrder(record);

    expect(order.id).toBe("recORDER123");
    expect(order.stripeSessionId).toBe("cs_test_abc");
    expect(order.stripePaymentIntent).toBe("pi_test_xyz");
    expect(order.customerEmail).toBe("buyer@example.com");
    expect(order.customerName).toBe("Jane Buyer");
    expect(order.totalCents).toBe(85000);
    expect(order.currency).toBe("USD");
    expect(order.status).toBe("paid");
    expect(order.paidAt).toBe("2026-01-01T12:00:00.000Z");
    expect(order.trackingNumber).toBe("1Z999AA10123456784");
    expect(order.trackingCarrier).toBe("UPS");
    expect(order.notes).toBe("Handle with care");
    expect(order.specimenIds).toEqual(["recSPEC001", "recSPEC002"]);
    expect(order.customerId).toBe("recCUST001");
  });

  it("returns pending status and empty arrays when fields are absent", async () => {
    const { mapRowToOrder } = await import("@/lib/airtable");

    const minimal = {
      id: "recEMPTY",
      createdTime: "2026-01-01T00:00:00.000Z",
      fields: { stripe_session_id: "cs_test_empty" },
    };

    const order = mapRowToOrder(minimal);
    expect(order.status).toBe("pending");
    expect(order.specimenIds).toEqual([]);
    expect(order.customerId).toBeUndefined();
    expect(order.currency).toBe("USD"); // default
  });
});

// ── Test 3: cache busts on write ──────────────────────────────────────────────

describe("cache busting on writes", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    setTokenEnv(STUB_TOKEN);
    process.env.BORUSSIA_AIRTABLE_BASE_ID = STUB_BASE;

    fetchSpy = vi.fn();
    originalFetch = globalThis.fetch;
    // Assign mock fetch — airtable.ts calls bare `fetch` which resolves through globalThis
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setTokenEnv(undefined);
    delete process.env.BORUSSIA_AIRTABLE_BASE_ID;
    globalThis.fetch = originalFetch;
  });

  it("re-fetches specimens after markSpecimensAsSold busts the cache", async () => {
    const { fetchAllSpecimens, markSpecimensAsSold, _clearCacheForTesting } = await import("@/lib/airtable");

    // Clear any cache state left from previous tests
    _clearCacheForTesting();

    const listResponse = {
      records: [
        { id: "recSPEC001", createdTime: "", fields: { id: "azur-001", name: "Azurite", availability: "available", publish_status: "published" } },
      ],
    };
    const soldListResponse = { records: [{ id: "recSPEC001", createdTime: "", fields: { id: "azur-001" } }] };
    const patchResponse    = { id: "recSPEC001", createdTime: "", fields: { id: "azur-001", availability: "sold" } };

    fetchSpy
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => listResponse, headers: new Headers() })      // call 1: list
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => soldListResponse, headers: new Headers() }) // markSold: search
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => patchResponse, headers: new Headers() })    // markSold: patch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => listResponse, headers: new Headers() });    // call 3: list again after bust

    // Call 1 — hits network
    const first = await fetchAllSpecimens();
    expect(first).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Call 2 — cache hit, no additional fetch
    const second = await fetchAllSpecimens();
    expect(second).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // markSpecimensAsSold: search + patch, then busts cache
    await markSpecimensAsSold(["azur-001"]);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    // Call 3 — cache busted, re-fetches
    const third = await fetchAllSpecimens();
    expect(third).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });
});

// ── Test 4: Missing env var throws at first call (not import) ─────────────────

describe("missing BORUSSIA_AIRTABLE_TOKEN", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    setTokenEnv(undefined);
    originalFetch = globalThis.fetch;
    // No-op fetch — the test should throw before fetch is ever called (token check fires first)
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    // Bust any cached specimens so the first call actually hits the network (and thus getToken)
    const { _clearCacheForTesting } = await import("@/lib/airtable");
    _clearCacheForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("does NOT throw at import time", async () => {
    // Importing the module should succeed even without the env var.
    await expect(import("@/lib/airtable")).resolves.toBeDefined();
  });

  it("throws an informative error at first API call when token is missing", async () => {
    const { fetchAllSpecimens } = await import("@/lib/airtable");

    await expect(fetchAllSpecimens()).rejects.toThrow("BORUSSIA_AIRTABLE_TOKEN");
  });
});
