import type { Specimen, FilterOptions } from "@/types";
import { wulfeniteSpecimens } from "./wulfenite";
import { fluoriteSpecimens } from "./fluorite";
import { azuriteSpecimens } from "./azurite";
import { benitoiteSpecimens, malachiteSpecimens, chrysocollaSpecimens, cupriteSpecimens } from "./other";

// All specimens aggregated
export const specimens: Specimen[] = [
  ...wulfeniteSpecimens,
  ...benitoiteSpecimens,
  ...fluoriteSpecimens,
  ...azuriteSpecimens,
  ...malachiteSpecimens,
  ...chrysocollaSpecimens,
  ...cupriteSpecimens,
];

// Re-export individual collections for direct access
export { wulfeniteSpecimens } from "./wulfenite";
export { fluoriteSpecimens } from "./fluorite";
export { azuriteSpecimens } from "./azurite";
export { benitoiteSpecimens, malachiteSpecimens, chrysocollaSpecimens, cupriteSpecimens } from "./other";

// Query functions
export function getSpecimenById(id: string): Specimen | undefined {
  return specimens.find((s) => s.id === id);
}

export function getSpecimensByMine(mineSlug: string): Specimen[] {
  return specimens.filter((s) => s.mineSlug === mineSlug);
}

export function getAvailableSpecimens(): Specimen[] {
  return specimens.filter((s) => s.availability === "available");
}

export function getFeaturedSpecimens(): Specimen[] {
  return specimens.filter((s) => s.featured);
}

export function getUniqueLocalities(): string[] {
  return [...new Set(specimens.map((s) => s.locality))];
}

export function getUniqueCrystalSystems(): string[] {
  return [...new Set(specimens.map((s) => s.crystalSystem))];
}

export function getUniqueMineralGroups(): string[] {
  return [...new Set(specimens.map((s) => s.mineralGroup).filter(Boolean))] as string[];
}

export function filterSpecimens(options: FilterOptions): Specimen[] {
  return specimens.filter((s) => {
    if (options.mineSlug && s.mineSlug !== options.mineSlug) return false;
    if (options.crystalSystem && s.crystalSystem !== options.crystalSystem) return false;
    if (options.mineralGroup && s.mineralGroup !== options.mineralGroup) return false;
    if (options.availability && s.availability !== options.availability) return false;
    if (options.maxPrice !== undefined && (s.price === undefined || s.price > options.maxPrice)) return false;
    if (options.minPrice !== undefined && (s.price === undefined || s.price < options.minPrice)) return false;
    return true;
  });
}
