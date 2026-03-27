"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Specimen, formatPrice, isPurchasable } from "@/lib/data";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  specimen: Specimen;
  className?: string;
}

export function ProductCard({ specimen, className }: ProductCardProps) {
  const { addItem, isInCart } = useCart();
  const priceText = formatPrice(specimen);
  const canPurchase = isPurchasable(specimen);
  const inCart = isInCart(specimen.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(specimen);
  };

  return (
    <Link href={`/specimen/${specimen.id}`} className="block group">
      <div
        className={cn(
          "silver-border matte-surface rounded-lg overflow-hidden transition-all duration-300 hover:shadow-silver",
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-square bg-gradient-to-b from-secondary/30 to-transparent">
          <Image
            src={specimen.image}
            alt={specimen.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"

          />
          {/* Availability Badge */}
          {specimen.availability === "sold" && (
            <div className="absolute top-3 right-3 bg-destructive/90 text-destructive-foreground text-xs uppercase tracking-wider px-2 py-1 rounded">
              Sold
            </div>
          )}
          {specimen.availability === "reserved" && (
            <div className="absolute top-3 right-3 bg-accent/90 text-accent-foreground text-xs uppercase tracking-wider px-2 py-1 rounded">
              Reserved
            </div>
          )}
          {specimen.availability === "private-collection" && (
            <div className="absolute top-3 right-3 bg-violet-600/90 text-white text-xs uppercase tracking-wider px-2 py-1 rounded">
              Private Collection
            </div>
          )}
          {specimen.mineSlug === "fat-jack" && specimen.availability === "available" && (
            <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider px-2 py-1 rounded">
              Fat Jack
            </div>
          )}
          {specimen.splatUrl && (
            <div className="absolute bottom-3 right-3 bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              3D
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {/* Name */}
          <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {specimen.name}
          </h3>

          {/* Locality */}
          <p className="text-xs text-muted-foreground line-clamp-1">
            {specimen.locality}
          </p>

          {/* Specs */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{specimen.crystalSystem}</span>
            <span>•</span>
            <span>{specimen.dimensions}</span>
          </div>

          {/* Price + Action */}
          <div className="flex items-center justify-between pt-2">
            <span
              className={cn(
                "font-medium",
                specimen.availability === "sold"
                  ? "text-muted-foreground line-through"
                  : priceText === "Price on Request"
                    ? "text-accent"
                    : "text-primary"
              )}
            >
              {priceText}
            </span>

            {canPurchase && (
              <Button
                variant={inCart ? "default" : "heroOutline"}
                size="sm"
                onClick={handleAddToCart}
                disabled={inCart}
                className="h-8 px-3"
              >
                {inCart ? (
                  <>
                    <Check className="w-3 h-3" />
                    Added
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3 h-3" />
                    Add
                  </>
                )}
              </Button>
            )}

            {!canPurchase && specimen.availability === "available" && (
              <Button variant="heroOutline" size="sm" className="h-8 px-3">
                Inquire
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
