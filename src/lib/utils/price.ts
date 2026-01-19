import type { Specimen } from "@/types";
import { PRICE_THRESHOLD } from "@/config";

export function formatPrice(specimen: Specimen): string {
  if (specimen.availability === "sold") {
    return "Sold";
  }
  if (specimen.priceDisplay) {
    return specimen.priceDisplay;
  }
  if (specimen.price === undefined || specimen.price >= PRICE_THRESHOLD) {
    return "Price on Request";
  }
  return `$${specimen.price.toLocaleString()}`;
}

export function isPurchasable(specimen: Specimen): boolean {
  return (
    specimen.availability === "available" &&
    specimen.price !== undefined &&
    specimen.price < PRICE_THRESHOLD
  );
}
