import type { Specimen } from "@/types";

// Benitoite sold — awaiting new inventory with Borussia Minerals cards
export const benitoiteSpecimens: Specimen[] = [];

export const malachiteSpecimens: Specimen[] = [
  {
    id: "mala-001",
    name: "Malachite Pseudomorph after Azurite",
    image: "/images/specimens/mala-002.jpg",
    locality: "New Cornelia Mine, Ajo, Pima County, Arizona, USA",
    crystalSystem: "Monoclinic",
    dimensions: "2¾ × 3⅞ in",
    weight: "410g",
    description:
      "Exceptional malachite pseudomorph after azurite from the New Cornelia Mine. Intergrown velvet malachite alongside blocky malachite pseudomorphs over azurite, with MnOx-coated porphyry matrix. Ex. Roter, ex. Mark Hay collection.",
    price: 5800,
    availability: "available",
    mineralGroup: "Carbonates",
    luster: "Silky to adamantine",
    transparency: "Translucent to opaque",
    provenance: "Ex. Dick Roter; ex. Mark Hay collection",
  },
];

export const chrysocollaSpecimens: Specimen[] = [
  {
    id: "chry-001",
    name: "Chrysocolla Pseudomorph after Azurite after Malachite",
    image: "/images/specimens/chry-001.jpg",
    locality: "Bagdad, Yavapai County, Arizona, USA",
    crystalSystem: "Amorphous",
    dimensions: "5.0 × 4.2 × 3.0 cm",
    weight: "185g",
    description:
      "A superb multi-generation pseudomorph: malachite replaced by chrysocolla, itself after azurite. Vibrant green botryoidal surface with distinctive layered texture. Bagdad is a classic locality for fine Arizona copper secondaries.",
    price: 850,
    availability: "available",
    mineralGroup: "Phyllosilicates",
    luster: "Waxy to dull",
    transparency: "Opaque",
  },
];

export const cupriteSpecimens: Specimen[] = [
  {
    id: "cupr-001",
    name: "Cuprite on Copper",
    image: "/images/specimens/cupr-001.jpg",
    locality: "Pearl Handle Pit, Ray, Mineral Creek District, Pinal County, Arizona, USA",
    crystalSystem: "Isometric (Cubic)",
    dimensions: "1½ × 3¼ in",
    weight: "210g",
    description:
      "Brilliant deep-red cuprite crystals — modified dodecahedral habit — to ¼\" coating native copper, with fragments of light-colored host rock. One of Arizona's most collectible copper oxide associations from the renowned Ray district.",
    price: 3200,
    availability: "available",
    mineralGroup: "Oxides",
    luster: "Adamantine to submetallic",
    transparency: "Translucent",
    provenance: "Ex. Valenzuela; Mark Hay collection, Phoenix, Arizona",
  },
  {
    id: "cupr-002",
    name: "Copper with Cuprite",
    image: "/images/specimens/cupr-002.jpg",
    locality: "Ray Mine, Pinal County, Arizona, USA",
    crystalSystem: "Isometric (Cubic)",
    dimensions: "6.0 × 5.0 × 4.0 cm",
    weight: "380g",
    description:
      "Native copper matrix hosting vivid cuprite crystals. The Ray Mine is one of Arizona's premier sources for copper-cuprite association specimens. Deep red cuprite contrasts beautifully against the metallic copper groundmass.",
    price: 2400,
    availability: "available",
    mineralGroup: "Oxides",
    luster: "Adamantine to metallic",
    transparency: "Translucent",
    provenance: "Dick Morris Collection",
  },
];
