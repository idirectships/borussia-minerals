// Legacy re-exports for backward compatibility
// New code should import from @/types, @/data, @/config, @/lib/utils

export type { Specimen, Mine } from "@/types";
export {
  specimens,
  mines,
  getSpecimenById,
  getSpecimensByMine,
  getMineBySlug,
  getAvailableSpecimens,
  getFeaturedSpecimens,
  getUniqueLocalities,
  getUniqueCrystalSystems,
  getUniqueMineralGroups,
  filterSpecimens,
} from "@/data";
export { PRICE_THRESHOLD, CONTACT } from "@/config";
export { formatPrice, isPurchasable } from "@/lib/utils";

// Legacy aliases
export const CONTACT_EMAIL = "borussiaminerals@gmail.com";
export const INSTAGRAM_HANDLE = "borussiaminerals";
