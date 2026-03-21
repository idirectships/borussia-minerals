// Domain Types

export interface Specimen {
  id: string;
  name: string;
  image: string;
  images?: string[];
  locality: string;
  crystalSystem: string;
  dimensions: string;
  description: string;
  featured?: boolean;
  price?: number;
  priceDisplay?: string;
  availability: "available" | "sold" | "reserved";
  mineSlug?: string;
  weight?: string;
  mineralGroup?: string;
  luster?: string;
  transparency?: string;
  provenance?: string;
  publishStatus?: "draft" | "review" | "published";
  splatUrl?: string;
  splatCamera?: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
}

export interface Mine {
  slug: string;
  name: string;
  location: string;
  shortDescription: string;
  history: string;
  geology: string;
  heroImage?: string;
  established?: string;
  minerals?: string[];
}

export interface CartItem {
  specimen: Specimen;
  quantity: number;
}

export interface FilterOptions {
  mineSlug?: string;
  crystalSystem?: string;
  mineralGroup?: string;
  availability?: Specimen["availability"];
  maxPrice?: number;
  minPrice?: number;
}
