export interface MineLocality {
  id: string;
  name: string;
  shortName: string;
  county: string;
  state: string;
  lat: number;
  lon: number;
  description: string;
  specimenIds: string[];
  minerals: string[];
}

// All current Borussia Minerals localities — all Arizona
export const localities: MineLocality[] = [
  {
    id: "morenci",
    name: "Morenci Mine",
    shortName: "Morenci",
    county: "Greenlee County",
    state: "Arizona",
    lat: 33.07,
    lon: -109.37,
    description:
      "One of the largest open-pit copper mines in North America. Famous for world-class azurite and malachite specimens.",
    specimenIds: ["azur-001", "azur-002"],
    minerals: ["Azurite", "Malachite", "Selenite"],
  },
  {
    id: "new-cornelia",
    name: "New Cornelia Mine",
    shortName: "Ajo",
    county: "Pima County",
    state: "Arizona",
    lat: 32.37,
    lon: -112.86,
    description:
      "Historic porphyry copper mine near Ajo. Source of exceptional malachite pseudomorphs after azurite on porphyry matrix.",
    specimenIds: ["mala-001"],
    minerals: ["Malachite", "Azurite", "Chrysocolla"],
  },
  {
    id: "bagdad",
    name: "Bagdad",
    shortName: "Bagdad",
    county: "Yavapai County",
    state: "Arizona",
    lat: 34.58,
    lon: -113.15,
    description:
      "Classic Arizona copper locality known for multi-generation pseudomorphs. Chrysocolla replacing azurite replacing malachite.",
    specimenIds: ["chry-001"],
    minerals: ["Chrysocolla", "Azurite", "Malachite"],
  },
  {
    id: "ray",
    name: "Ray Mine / Pearl Handle Pit",
    shortName: "Ray",
    county: "Pinal County",
    state: "Arizona",
    lat: 33.15,
    lon: -110.97,
    description:
      "Premier source for Arizona cuprite-on-copper association specimens from the Mineral Creek District.",
    specimenIds: ["cupr-001", "cupr-002"],
    minerals: ["Cuprite", "Native Copper"],
  },
];
