/**
 * Google Sheets integration unit tests.
 *
 * Strategy: mock the `googleapis` module entirely — no real HTTP calls,
 * no real credentials. GOV-052: GOOGLE_ credentials are stubs only.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Credential stubs (GOV-052) ───────────────────────────────────────────────
// A minimal fake service-account JSON (structurally valid, non-functional)
const FAKE_SA_KEY = JSON.stringify({
  type: "service_account",
  project_id: "test-project",
  private_key_id: "key-id",
  private_key:
    "-----BEGIN RSA PRIVATE KEY-----\nFAKE\n-----END RSA PRIVATE KEY-----\n",
  client_email: "test-sa@test-project.iam.gserviceaccount.com",
  client_id: "000000000000000000000",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/test-sa",
});

// ── Mocked Sheets API primitives ──────────────────────────────────────────────
const mockGet = vi.fn();
const mockBatchUpdate = vi.fn();

// googleapis exports `google` with two relevant shapes:
//   google.auth.GoogleAuth  — used with `new GoogleAuth({...})`
//   google.sheets(opts)     — factory function (NOT a constructor)
vi.mock("googleapis", () => {
  // GoogleAuth must be constructable
  function MockGoogleAuth() {
    return {};
  }

  // google.sheets is a factory (called without new)
  function sheetsFactory() {
    return {
      spreadsheets: {
        values: {
          get: mockGet,
          batchUpdate: mockBatchUpdate,
        },
      },
    };
  }

  return {
    google: {
      auth: {
        GoogleAuth: MockGoogleAuth,
      },
      sheets: sheetsFactory,
    },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────
// Raw sheet rows matching the 15-column layout (A–O)
function makeSheetRow(overrides: Record<string, string> = {}): string[] {
  const defaults: Record<string, string> = {
    0: "cupr-001",           // id
    1: "Fat Jack Wulfenite", // name
    2: "Wulfenite",          // mineral
    3: "Fat Jack Mine, AZ",  // locality
    4: "Tetragonal",         // crystalSystem
    5: "5 × 4 × 3 cm",      // dimensions
    6: "120g",               // weight
    7: "$850",               // price
    8: "available",          // availability
    9: "A fine specimen.",   // description
    10: "",                  // photoIds
    11: "",                  // notes
    12: "published",         // publishStatus
    13: "collector",         // tier
    14: "",                  // narrative
  };
  const merged = { ...defaults, ...overrides };
  // Return as ordered array
  return Array.from({ length: 15 }, (_, i) => merged[String(i)] ?? "");
}

// ── fetchAllSpecimens ─────────────────────────────────────────────────────────
describe("google-sheets fetchAllSpecimens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = FAKE_SA_KEY;
    process.env.GOOGLE_SHEET_ID = "test-sheet-id";
  });

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_SHEET_ID;
  });

  it("returns empty array when GOOGLE_SERVICE_ACCOUNT_KEY is not set", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const result = await fetchAllSpecimens();
    expect(result).toEqual([]);
  });

  it("returns empty array when the sheet has no rows", async () => {
    mockGet.mockResolvedValue({ data: { values: null } });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const result = await fetchAllSpecimens();
    expect(result).toEqual([]);
  });

  it("maps a single valid row to a Specimen with correct fields", async () => {
    mockGet.mockResolvedValue({ data: { values: [makeSheetRow()] } });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const specimens = await fetchAllSpecimens();

    expect(specimens).toHaveLength(1);
    const s = specimens[0];
    expect(s.id).toBe("cupr-001");
    expect(s.name).toBe("Fat Jack Wulfenite");
    expect(s.price).toBe(850);
    expect(s.availability).toBe("available");
    expect(s.publishStatus).toBe("published");
    expect(s.tier).toBe("collector");
  });

  it("maps price string with dollar sign and comma correctly", async () => {
    mockGet.mockResolvedValue({
      data: { values: [makeSheetRow({ 7: "$1,200" })] },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const [s] = await fetchAllSpecimens();
    expect(s.price).toBe(1200);
  });

  it("sets availability from sheet value (sold)", async () => {
    mockGet.mockResolvedValue({
      data: { values: [makeSheetRow({ 8: "sold" })] },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const [s] = await fetchAllSpecimens();
    expect(s.availability).toBe("sold");
  });

  it("normalises 'Private Collection' to 'private-collection'", async () => {
    mockGet.mockResolvedValue({
      data: { values: [makeSheetRow({ 8: "Private Collection" })] },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const [s] = await fetchAllSpecimens();
    expect(s.availability).toBe("private-collection");
  });

  it("filters out rows with no id or name", async () => {
    mockGet.mockResolvedValue({
      data: {
        values: [
          makeSheetRow(),                         // valid
          makeSheetRow({ 0: "", 1: "Bad" }),      // no id
          makeSheetRow({ 0: "x", 1: "" }),        // no name
        ],
      },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const result = await fetchAllSpecimens();
    expect(result).toHaveLength(1);
  });

  it("builds Google Drive image URL when photoIds are present", async () => {
    mockGet.mockResolvedValue({
      data: { values: [makeSheetRow({ 10: "abc123,def456" })] },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const [s] = await fetchAllSpecimens();
    expect(s.image).toBe("https://lh3.googleusercontent.com/d/abc123");
    expect(s.images).toHaveLength(2);
    expect(s.images?.[1]).toBe("https://lh3.googleusercontent.com/d/def456");
  });

  it("falls back to local specimen path when photoIds is empty", async () => {
    mockGet.mockResolvedValue({
      data: { values: [makeSheetRow({ 10: "" })] },
    });
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const [s] = await fetchAllSpecimens();
    expect(s.image).toBe("/images/specimens/cupr-001.jpg");
    expect(s.images).toBeUndefined();
  });

  it("returns empty array and does not throw when Sheets API call fails", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));
    vi.resetModules();
    const { fetchAllSpecimens } = await import("@/lib/google-sheets");
    const result = await fetchAllSpecimens();
    expect(result).toEqual([]);
  });
});

// ── fetchSpecimens (published filter) ────────────────────────────────────────
describe("google-sheets fetchSpecimens (published filter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = FAKE_SA_KEY;
    process.env.GOOGLE_SHEET_ID = "test-sheet-id";
  });

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_SHEET_ID;
  });

  it("filters out draft and review specimens, keeps published", async () => {
    mockGet.mockResolvedValue({
      data: {
        values: [
          makeSheetRow({ 0: "pub-001", 1: "Published", 12: "published" }),
          makeSheetRow({ 0: "dft-001", 1: "Draft",     12: "draft" }),
          makeSheetRow({ 0: "rev-001", 1: "Review",    12: "review" }),
        ],
      },
    });
    vi.resetModules();
    const { fetchSpecimens } = await import("@/lib/google-sheets");
    const result = await fetchSpecimens();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pub-001");
  });
});

// ── markSpecimensAsSold ───────────────────────────────────────────────────────
describe("google-sheets markSpecimensAsSold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = FAKE_SA_KEY;
    process.env.GOOGLE_SHEET_ID = "test-sheet-id";
  });

  afterEach(() => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_SHEET_ID;
  });

  it("no-ops when specimenIds is empty", async () => {
    vi.resetModules();
    const { markSpecimensAsSold } = await import("@/lib/google-sheets");
    await markSpecimensAsSold([]);
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it("calls batchUpdate with correct range for a found specimen (row 2 = index 0)", async () => {
    // Column A values: row 2 = cupr-001, row 3 = cupr-002
    mockGet.mockResolvedValue({
      data: { values: [["cupr-001"], ["cupr-002"]] },
    });
    mockBatchUpdate.mockResolvedValue({});

    vi.resetModules();
    const { markSpecimensAsSold } = await import("@/lib/google-sheets");
    await markSpecimensAsSold(["cupr-001"]);

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              range: "Inventory!I2",
              values: [["sold"]],
            }),
          ]),
        }),
      })
    );
  });

  it("skips specimens not found in the sheet — no throw, no batchUpdate", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["cupr-001"]] },
    });
    mockBatchUpdate.mockResolvedValue({});

    vi.resetModules();
    const { markSpecimensAsSold } = await import("@/lib/google-sheets");
    await expect(markSpecimensAsSold(["not-in-sheet"])).resolves.toBeUndefined();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});
