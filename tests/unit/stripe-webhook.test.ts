/**
 * Stripe webhook handler unit tests.
 *
 * Strategy: mock stripe.webhooks.constructEvent and markSpecimensAsSold so
 * no real Stripe API calls or Google Sheets writes are made.
 * GOV-052: STRIPE_ credentials are stubs only.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Credential stubs (GOV-052) ───────────────────────────────────────────────
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key_for_unit_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret";

// ── Mock google-sheets so markSpecimensAsSold never calls the Sheets API ─────
vi.mock("@/lib/google-sheets", () => ({
  markSpecimensAsSold: vi.fn().mockResolvedValue(undefined),
  fetchSpecimenById: vi.fn(),
  fetchSpecimens: vi.fn().mockResolvedValue([]),
  fetchAllSpecimens: vi.fn().mockResolvedValue([]),
}));

// ── Mock the Stripe constructor + constructEvent ──────────────────────────────
// Stripe is used as `new Stripe(key)` so the mock must be a constructable fn.
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  function MockStripe() {
    return {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    };
  }
  return { default: MockStripe };
});

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

function makeCheckoutEvent(specimenIds: string, paymentStatus = "paid"): object {
  return {
    type: "checkout.session.completed",
    id: "evt_test_001",
    data: {
      object: {
        id: "cs_test_session_001",
        amount_total: 120000,
        currency: "usd",
        payment_status: paymentStatus,
        metadata: { specimen_ids: specimenIds },
        customer_details: {
          email: "test@example.com",
          name: "Test Buyer",
        },
        shipping_cost: { amount_total: 4500 },
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
      // No stripe-signature header
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature|webhook/i);
  });

  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest("{}", "invalid-sig");
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/signature/i);
  });

  it("returns 200 and { received: true } for a valid checkout.session.completed event", async () => {
    const event = makeCheckoutEvent("cupr-001,cupr-002");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("calls markSpecimensAsSold with correct IDs on checkout.session.completed", async () => {
    const { markSpecimensAsSold } = await import("@/lib/google-sheets");
    const event = makeCheckoutEvent("cupr-001, cupr-002");
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    await POST(req);

    expect(markSpecimensAsSold).toHaveBeenCalledWith(["cupr-001", "cupr-002"]);
  });

  it("returns 200 for checkout.session.expired (no action required)", async () => {
    const event = {
      type: "checkout.session.expired",
      id: "evt_expired",
      data: { object: { id: "cs_expired" } },
    };
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });

  it("returns 200 for payment_intent.payment_failed (logged, no action)", async () => {
    const event = {
      type: "payment_intent.payment_failed",
      id: "evt_failed",
      data: {
        object: {
          id: "pi_failed",
          last_payment_error: { message: "Your card was declined." },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("returns 200 for unhandled event types", async () => {
    const event = {
      type: "customer.created",
      id: "evt_customer",
      data: { object: {} },
    };
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it("does not call markSpecimensAsSold when specimen_ids metadata is empty", async () => {
    const { markSpecimensAsSold } = await import("@/lib/google-sheets");
    const event = makeCheckoutEvent(""); // empty specimen_ids
    mockConstructEvent.mockReturnValue(event);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = makeRequest(JSON.stringify(event));
    await POST(req);

    expect(markSpecimensAsSold).not.toHaveBeenCalled();
  });
});
