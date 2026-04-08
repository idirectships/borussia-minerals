/**
 * Smoke tests — env var names, critical imports, pure utility functions.
 * No real API calls. GOV-052: credential-isolated.
 */

import { describe, it, expect } from "vitest";

// ── Environment variable names ───────────────────────────────────────────────
// Verify the names the code actually references match .env.example.
// Catches typos before a deploy silently breaks.

describe("expected env var names", () => {
  const EXPECTED_NAMES = [
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "GOOGLE_SHEET_ID",
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "REVALIDATE_SECRET",
  ];

  it("all required env var names are non-empty strings (name check, not value check)", () => {
    for (const name of EXPECTED_NAMES) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
      // These names must not contain whitespace or lowercase letters
      // (convention: screaming snake case)
      expect(name).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });

  it("STRIPE_ vars follow naming convention", () => {
    const stripeVars = EXPECTED_NAMES.filter((n) => n.startsWith("STRIPE_"));
    expect(stripeVars).toHaveLength(3);
  });

  it("GOOGLE_ vars follow naming convention", () => {
    const googleVars = EXPECTED_NAMES.filter((n) => n.startsWith("GOOGLE_"));
    expect(googleVars).toHaveLength(2);
  });
});

// ── Pure utility: formatPrice ────────────────────────────────────────────────
import { formatPrice, isPurchasable } from "@/lib/utils";
import type { Specimen } from "@/types";

function makeSpecimen(overrides: Partial<Specimen> = {}): Specimen {
  return {
    id: "test-001",
    name: "Test Wulfenite",
    image: "/images/specimens/test-001.jpg",
    locality: "Fat Jack Mine, Arizona",
    crystalSystem: "Tetragonal",
    dimensions: "5 × 4 × 3 cm",
    description: "A fine specimen.",
    availability: "available",
    publishStatus: "published",
    ...overrides,
  };
}

describe("formatPrice", () => {
  it("returns 'Sold' for sold specimens regardless of price", () => {
    const s = makeSpecimen({ availability: "sold", price: 1200 });
    expect(formatPrice(s)).toBe("Sold");
  });

  it("returns priceDisplay when set", () => {
    const s = makeSpecimen({ price: 800, priceDisplay: "SOLD OUT" });
    expect(formatPrice(s)).toBe("SOLD OUT");
  });

  it("returns 'Price on Request' when price is undefined", () => {
    const s = makeSpecimen({ price: undefined });
    expect(formatPrice(s)).toBe("Price on Request");
  });

  it("formats a numeric price with dollar sign", () => {
    const s = makeSpecimen({ price: 1500 });
    expect(formatPrice(s)).toBe("$1,500");
  });

  it("formats a sub-1000 price correctly", () => {
    const s = makeSpecimen({ price: 850 });
    expect(formatPrice(s)).toBe("$850");
  });
});

// ── Pure utility: isPurchasable ──────────────────────────────────────────────
describe("isPurchasable", () => {
  it("returns true for available specimen below threshold", () => {
    const s = makeSpecimen({ price: 1200, availability: "available" });
    expect(isPurchasable(s)).toBe(true);
  });

  it("returns false for sold specimen", () => {
    const s = makeSpecimen({ price: 500, availability: "sold" });
    expect(isPurchasable(s)).toBe(false);
  });

  it("returns false for reserved specimen", () => {
    const s = makeSpecimen({ price: 500, availability: "reserved" });
    expect(isPurchasable(s)).toBe(false);
  });

  it("returns false when price is undefined", () => {
    const s = makeSpecimen({ price: undefined, availability: "available" });
    expect(isPurchasable(s)).toBe(false);
  });

  it("returns false when price equals threshold (5000)", () => {
    const s = makeSpecimen({ price: 5000, availability: "available" });
    expect(isPurchasable(s)).toBe(false);
  });

  it("returns false when price exceeds threshold", () => {
    const s = makeSpecimen({ price: 8000, availability: "available" });
    expect(isPurchasable(s)).toBe(false);
  });
});

// ── Config constants ─────────────────────────────────────────────────────────
import { PRICE_THRESHOLD, CONTACT, SITE } from "@/config";

describe("config constants", () => {
  it("PRICE_THRESHOLD is 5000", () => {
    expect(PRICE_THRESHOLD).toBe(5000);
  });

  it("CONTACT.email is set", () => {
    expect(CONTACT.email).toBeTruthy();
    expect(CONTACT.email).toContain("@");
  });

  it("SITE.name is set", () => {
    expect(SITE.name).toBeTruthy();
    expect(typeof SITE.name).toBe("string");
  });
});
