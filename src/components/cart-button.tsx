"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function CartButton() {
  const { toggleCart, getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <button
      onClick={toggleCart}
      className="relative text-muted-foreground hover:text-primary transition-colors"
      aria-label="Open cart"
    >
      <ShoppingCart className="w-5 h-5" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 w-5 h-5 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
}
