"use client";

import { useRef } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { StickyCTABar } from "@/components/sticky-cta-bar";
import type { Specimen } from "@/types";

interface SpecimenCTASectionProps {
  specimenId: string;
  specimenName: string;
  priceText: string;
  canPurchase: boolean;
  availability: Specimen["availability"];
}

export function SpecimenCTASection({
  specimenId,
  specimenName,
  priceText,
  canPurchase,
  availability,
}: SpecimenCTASectionProps) {
  const ctaRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Main CTA — observed by IntersectionObserver */}
      <div ref={ctaRef}>
        <AddToCartButton
          specimenId={specimenId}
          canPurchase={canPurchase}
          availability={availability}
        />
      </div>

      {/* Mobile sticky bar — appears when main CTA scrolls out of view */}
      <StickyCTABar
        specimenId={specimenId}
        specimenName={specimenName}
        priceText={priceText}
        canPurchase={canPurchase}
        availability={availability}
        ctaRef={ctaRef}
      />
    </>
  );
}
