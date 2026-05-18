/**
 * Stripe webhook → Airtable side-effects unit tests (Phase 5).
 *
 * Strategy: mock @/lib/airtable, @/lib/google-sheets, stripe, and global fetch
 * so no real HTTP calls are made. GOV-052: credentials are stubs only.
 *
 * Covers:
 * 1. checkout.session.completed → createOrder called with the session
 * 2. checkout.session.completed → markSpecimensAsSold called with extracted IDs
 * 3. checkout.session.completed → ISR revalidate fetch called for /store + per-specimen
 * 4. checkout.session.completed with no specimen_ids → markSpecimensAsSold NOT called
 * 5. charge.refunded with stripe_session_id metadata → updateOrderStatus('refunded') called
 * 6. charge.refunded with no metadata → updateOrderStatus NOT called, no throw
 * 7. charge.refunded → specimens NOT modified (markSpecimensAsSold NOT called)
 * 8. Airtable errors are caught and do not cause the webhook to return 5xx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Credential stubs (GOV-052) ────────────────────────────────────────────────
process.env.STRIPE_SECRET_KEY      = "sk_test_mock_for_phase5_tests";
process.env.STRIPE_WEBHOOK_SECRET  = "whsec_test_mock_phase5";
process.env.REVALIDATE_SECRET      = "test_revalidate_secret_xyz";
process.env.NEXT_PUBLIC_SITE_URL   = "http://localhost:3000";
process.env.BORUSSIA_AIRTABLE_TOKEN   = "patSTUBTOKEN_phase5.mock";
process.env.BORUSSIA_AIRTABLE_BASE_ID = "appSTUBBASE_phase5";

// ── Mock @/lib/airtable ───────────────────────────────────────────────────────
const mockCreateOrder         = vi.fn().mockResolvedValue({ id: "recOrderMock001" });
const mockMarkSpecimensAsSold = vi.fn().mockResolvedValue(undefined);
const mockUpdateOrderStatus   = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/airtable", () => ({
  createOrder:         mockCreateOrder,
  markSpecimensAsSold: mockMarkSpecimensAsSold,
  updateOrderStatus:   mockUpdateOrderStatus,
  // Export stubs for anything else the webhook might import
  fetchAllSpecimens:   vi.fn().mockResolvedValue([]),
  fetchSpecimenById:   vi.fn().mockResolvedValue(null),
}));

// ── Mock @/lib/google-sheets ──────────────────────────────────────────────────
vi.mock("@/lib/google-sheets", () => ({
  markSpecimensAsSold: vi.fn().mockResolvedValue(undefined),
  fetchSpecimenById:   vi.fn(),
  fetchSpecimens:      vi.fn().mockResolvedValue([]),
  fetchAllSpecimens:   vi.fn().mockResolvedValue([]),
}));

// ── Mock Stripe constructor + constructEvent ──────────────────────────────────
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  function MockStripe() {
    return {
      webhooks: { constructEvent: mockConstructEvent },
    };
  }
  return { default: MockStripe };
});

// ── Mock global fetch for ISR revalidation ────────────────────────────────────
const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
vi.stubGlobal("fetch", mockFetch);

// ── Helpers ───────────────────────────────────────────────────────────────────
import { NextRequest } from "next/server";

function makeRequest(body: string, signature = "valid-sig"): NextRequest {
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
      "content-type": "text/plain",
    },
  });
}

function makeCheckoutSession(specimenIds: string, extras: Record<string, unknown> = {}) {
  return {
    id:              "cs_test_phase5_001",
    amount_total:    120000,
    currency:        "usd",
    payment_status:  "paid",
    payment_intent:  "pi_test_phase5_001",
    metadata:        { specimen_ids: specimenIds },
    customer_details: {
      email: "buyer@example.com",
      name:  "Jane Buyer",
    },
    shipping_cost: { amount_total: 1500 },
    ...extras,
  };
}

function makeCheckoutEvent(specimenIds: string, extras: Record<string, unknown> = {}) {
  return {
    type: "checkout.session.completed",
    id:   "evt_phase5_checkout",
    data: { object: makeCheckoutSession(specimenIds, extras) },
  };
}

function makeRefundedEvent(chargeExtras: Record<string, unknown> = {}) {
  return {
    type: "charge.refunded",
    id:   "evt_phase5_refund",
    data: {
      object: {
        id:               "ch_test_phase5_refund",
        payment_intent:   "pi_test_phase5_001",
        amount_refunded:  120000,
        metadata:         {},
        ...chargeExtras,
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/webhooks/stripe — Phase 5 Airtable side effects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // checkout.session.completed
  // ────────────────────────────────────────────────────────────────────────────

  it("calls airtable.createOrder with the Stripe session on checkout.session.completed", async () => {
    const event = makeCheckoutEvent("cupr-001,azur-002");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(mockCreateOrder).toHaveBeenCalledOnce();
    // First argument must be the session object
    const [sessionArg] = mockCreateOrder.mock.calls[0];
    expect(sessionArg.id).toBe("cs_test_phase5_001");
    expect(sessionArg.metadata?.specimen_ids).toBe("cupr-001,azur-002");
  });

  it("calls airtable.markSpecimensAsSold with trimmed IDs on checkout.session.completed", async () => {
    const event = makeCheckoutEvent("cupr-001, azur-002 , fluor-003");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    await POST(makeRequest(JSON.stringify(event)));

    expect(mockMarkSpecimensAsSold).toHaveBeenCalledOnce();
    const [idsArg] = mockMarkSpecimensAsSold.mock.calls[0];
    expect(idsArg).toEqual(["cupr-001", "azur-002", "fluor-003"]);
  });

  it("triggers ISR revalidation for /store and each specimen path on checkout", async () => {
    const event = makeCheckoutEvent("cupr-001,azur-002");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    await POST(makeRequest(JSON.stringify(event)));

    // fetch is also called by Airtable internally when mocked; we need to check
    // ISR calls specifically — filter by URL containing /api/revalidate
    const revalidateCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/api/revalidate"),
    );

    expect(revalidateCalls.length).toBe(3); // /store + /specimens/cupr-001 + /specimens/azur-002

    const urls = revalidateCalls.map(([url]) => url as string);
    expect(urls.some((u) => u.includes("path=%2Fstore"))).toBe(true);
    expect(urls.some((u) => u.includes("path=%2Fspecimens%2Fcupr-001"))).toBe(true);
    expect(urls.some((u) => u.includes("path=%2Fspecimens%2Fazur-002"))).toBe(true);
    // Secret must be present in all revalidation calls
    expect(urls.every((u) => u.includes("test_revalidate_secret_xyz"))).toBe(true);
  });

  it("does NOT call airtable.markSpecimensAsSold when specimen_ids metadata is absent", async () => {
    const event = makeCheckoutEvent(""); // empty string → no IDs after filter
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    await POST(makeRequest(JSON.stringify(event)));

    expect(mockMarkSpecimensAsSold).not.toHaveBeenCalled();
  });

  it("does NOT trigger ISR when specimen_ids metadata is absent", async () => {
    const event = makeCheckoutEvent("");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    await POST(makeRequest(JSON.stringify(event)));

    const revalidateCalls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === "string" && url.includes("/api/revalidate"),
    );
    expect(revalidateCalls.length).toBe(0);
  });

  it("returns 200 even when airtable.createOrder throws (non-fatal)", async () => {
    mockCreateOrder.mockRejectedValueOnce(new Error("Airtable unavailable"));

    const event = makeCheckoutEvent("cupr-001");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("returns 200 even when airtable.markSpecimensAsSold throws (non-fatal)", async () => {
    mockMarkSpecimensAsSold.mockRejectedValueOnce(new Error("Airtable patch timeout"));

    const event = makeCheckoutEvent("cupr-001");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // charge.refunded
  // ────────────────────────────────────────────────────────────────────────────

  it("calls airtable.updateOrderStatus('refunded') when charge.refunded has session_id in metadata", async () => {
    const event = makeRefundedEvent({
      metadata: { stripe_session_id: "cs_test_phase5_001" },
    });
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(mockUpdateOrderStatus).toHaveBeenCalledOnce();
    const [sessionIdArg, statusArg] = mockUpdateOrderStatus.mock.calls[0];
    expect(sessionIdArg).toBe("cs_test_phase5_001");
    expect(statusArg).toBe("refunded");
  });

  it("does NOT call updateOrderStatus when charge.refunded has no stripe_session_id metadata", async () => {
    const event = makeRefundedEvent({ metadata: {} });
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  it("does NOT call markSpecimensAsSold on charge.refunded — specimens stay sold", async () => {
    const event = makeRefundedEvent({
      metadata: { stripe_session_id: "cs_test_phase5_001" },
    });
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    await POST(makeRequest(JSON.stringify(event)));

    expect(mockMarkSpecimensAsSold).not.toHaveBeenCalled();
  });

  it("returns 200 even when airtable.updateOrderStatus throws on charge.refunded (non-fatal)", async () => {
    mockUpdateOrderStatus.mockRejectedValueOnce(new Error("Airtable search failed"));

    const event = makeRefundedEvent({
      metadata: { stripe_session_id: "cs_test_phase5_001" },
    });
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(makeRequest(JSON.stringify(event)));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
