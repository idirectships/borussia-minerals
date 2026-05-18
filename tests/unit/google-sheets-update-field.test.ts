/**
 * Unit tests for updateSpecimenField in google-sheets.ts.
 *
 * Strategy: same googleapis mock pattern as google-sheets.test.ts.
 * No real HTTP calls, no real credentials (GOV-052).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Credential stubs (GOV-052) ───────────────────────────────────────────────
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

vi.mock("googleapis", () => {
  function MockGoogleAuth() {
    return {};
  }

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

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("google-sheets updateSpecimenField", () => {
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

  it("writes the correct cell range when specimen is found (row = index + 2)", async () => {
    // Sheet column A: chry-001 at index 0 → row 2, cupr-001 at index 1 → row 3
    mockGet.mockResolvedValue({
      data: { values: [["chry-001"], ["cupr-001"], ["wulf-001"]] },
    });
    mockBatchUpdate.mockResolvedValue({});

    vi.resetModules();
    const { updateSpecimenField } = await import("@/lib/google-sheets");
    await updateSpecimenField("cupr-001", "locality", "Ray Mine, AZ");

    // cupr-001 is at index 1 → sheetRow 3, locality = column D
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              range: "Inventory!D3",
              values: [["Ray Mine, AZ"]],
            }),
          ]),
        }),
      })
    );
  });

  it("writes to column D (locality) for the correct specimen at row 2 (index 0)", async () => {
    // chry-001 at index 0 → row 2
    mockGet.mockResolvedValue({
      data: { values: [["chry-001"], ["cupr-001"]] },
    });
    mockBatchUpdate.mockResolvedValue({});

    vi.resetModules();
    const { updateSpecimenField } = await import("@/lib/google-sheets");
    await updateSpecimenField("chry-001", "locality", "Bagdad, Yavapai County, Arizona, USA");

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              range: "Inventory!D2",
              values: [["Bagdad, Yavapai County, Arizona, USA"]],
            }),
          ]),
        }),
      })
    );
  });

  it("throws when specimenId is not found in the sheet", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["chry-001"], ["cupr-001"]] },
    });

    vi.resetModules();
    const { updateSpecimenField } = await import("@/lib/google-sheets");

    await expect(
      updateSpecimenField("not-in-sheet", "locality", "Somewhere, AZ")
    ).rejects.toThrow('specimen "not-in-sheet" not found in sheet');
  });

  it("throws when field has no column mapping", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["chry-001"]] },
    });

    vi.resetModules();
    const { updateSpecimenField } = await import("@/lib/google-sheets");

    await expect(
      updateSpecimenField("chry-001", "splatUrl" as keyof import("@/types").Specimen, "test")
    ).rejects.toThrow('no column mapping for field "splatUrl"');
  });

  it("sets allSpecimensCache to null (cache-busts) after a successful write", async () => {
    // Prime the cache by doing a fetch first, then verify cache is cleared after update
    const sheetRows = [
      ["chry-001", "Chrysocolla", "Silicate", "Old Locality, AZ", "", "", "", "$800", "available", "", "", "", "published", "collector", ""],
    ];
    // First call (fetchAll) returns full rows, second call (updateField idRows) returns just col A
    mockGet
      .mockResolvedValueOnce({ data: { values: sheetRows } })   // fetchAllSpecimens
      .mockResolvedValueOnce({ data: { values: [["chry-001"]] } }); // updateSpecimenField id scan
    mockBatchUpdate.mockResolvedValue({});

    vi.resetModules();
    const { fetchAllSpecimens, updateSpecimenField } = await import("@/lib/google-sheets");

    // Warm the cache
    await fetchAllSpecimens();
    // Now update — should bust the cache
    await updateSpecimenField("chry-001", "locality", "Bagdad, Yavapai County, Arizona, USA");

    // After bust, next fetchAllSpecimens should call mockGet again (not return cached)
    mockGet.mockResolvedValueOnce({ data: { values: sheetRows } });
    await fetchAllSpecimens();

    // mockGet called: 1 (fetchAll warm) + 1 (update id scan) + 1 (fetchAll post-bust) = 3
    expect(mockGet).toHaveBeenCalledTimes(3);
  });
});
