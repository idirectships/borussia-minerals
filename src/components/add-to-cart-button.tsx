"use client";

import { ShoppingCart, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { type Specimen, CONTACT_EMAIL } from "@/lib/data";

interface AddToCartButtonProps {
  specimenId: string;
  canPurchase: boolean;
  availability: Specimen["availability"];
}

export function AddToCartButton({
  specimenId,
  canPurchase,
  availability,
}: AddToCartButtonProps) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(specimenId);

  if (availability === "sold") {
    return (
      <Button variant="heroOutline" size="lg" disabled className="w-full">
        Sold
      </Button>
    );
  }

  if (availability === "reserved") {
    return (
      <Button variant="heroOutline" size="lg" disabled className="w-full">
        Reserved
      </Button>
    );
  }

  if (!canPurchase) {
    return (
      <a href={`mailto:${CONTACT_EMAIL}?subject=Inquiry%20about%20specimen`}>
        <Button variant="hero" size="lg" className="w-full">
          <Mail className="w-4 h-4" />
          Inquire About This Piece
        </Button>
      </a>
    );
  }

  if (inCart) {
    return (
      <Button variant="default" size="lg" disabled className="w-full">
        <Check className="w-4 h-4" />
        Added to Cart
      </Button>
    );
  }

  return (
    <Button
      variant="hero"
      size="lg"
      className="w-full"
      onClick={() => addItem(specimenId)}
    >
      <ShoppingCart className="w-4 h-4" />
      Add to Cart
    </Button>
  );
}
