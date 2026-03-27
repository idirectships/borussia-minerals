"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import type { Specimen } from "@/types";
import { CONTACT_EMAIL } from "@/lib/data";

interface StickyCTABarProps {
  specimen: Specimen;
  specimenName: string;
  priceText: string;
  canPurchase: boolean;
  availability: string;
  /** Ref to the main CTA button — bar shows when this scrolls out of view */
  ctaRef: React.RefObject<HTMLDivElement | null>;
}

export function StickyCTABar({
  specimen,
  specimenName,
  priceText,
  canPurchase,
  availability,
  ctaRef,
}: StickyCTABarProps) {
  const [visible, setVisible] = useState(false);
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(specimen.id);

  useEffect(() => {
    const target = ctaRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky bar when main CTA is NOT visible
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [ctaRef]);

  // Don't render for sold/reserved
  if (availability === "sold" || availability === "reserved") return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          {/* Specimen info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-display text-foreground truncate">
              {specimenName}
            </p>
            <p className={`text-sm font-semibold ${
              priceText === "Price on Request"
                ? "text-muted-foreground"
                : "text-accent"
            }`}>
              {priceText}
            </p>
          </div>

          {/* Action button */}
          {canPurchase ? (
            <Button
              variant={inCart ? "default" : "hero"}
              size="sm"
              disabled={inCart}
              onClick={() => addItem(specimen)}
              className="shrink-0"
            >
              {inCart ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add to Cart
                </>
              )}
            </Button>
          ) : (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Inquiry%20about%20${encodeURIComponent(specimenName)}`}
              className="shrink-0"
            >
              <Button variant="hero" size="sm">
                <Mail className="w-3.5 h-3.5" />
                Inquire
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
