/**
 * Splat specimen catalog for the staging viewer.
 *
 * To add a new specimen:
 *   1. Upload the PLY to Vercel Blob via `scripts/upload-splats.mjs`
 *   2. Add the entry here with the returned URL
 *   3. The /splats staging page picks it up automatically
 *
 * Local PLY source: ~/splat-data/previews/best/
 */

export interface SplatEntry {
  id: string;
  label: string;
  mineral: string;
  url: string;
  /** Optional camera override. Defaults to front-facing at distance 3. */
  camera?: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
}

const BLOB_BASE =
  "https://fh3asutxdchzzmhw.public.blob.vercel-storage.com/borussia-splats";

export const SPLAT_CATALOG: SplatEntry[] = [
  {
    id: "azur-001",
    label: "Azurite Cluster",
    mineral: "Azurite",
    url: `${BLOB_BASE}/crystal-cropped-15k.ply`,
  },
  {
    id: "cupr-001",
    label: "Cuprite on Native Copper",
    mineral: "Cuprite",
    url: `${BLOB_BASE}/cuprite-v2-colmap-30k.ply`,
  },
  // chry-001 PLY exists locally (~/splat-data/previews/best/chry-001-7k.ply)
  // but has not been uploaded to Vercel Blob yet. Uncomment after upload:
  // {
  //   id: "chry-001",
  //   label: "Chrysocolla after Malachite",
  //   mineral: "Chrysocolla",
  //   url: `${BLOB_BASE}/green-crystal-cropped-7k.ply`,
  // },
];
