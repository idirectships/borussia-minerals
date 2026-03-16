"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, getSubtotal } = useCart();

  const subtotal = getSubtotal();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="font-display text-xl text-foreground">Your Cart</h2>
            <button
              onClick={closeCart}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-6">Your cart is empty</p>
                <Button variant="heroOutline" onClick={closeCart}>
                  Continue Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.specimenId}
                    className="flex gap-4 pb-6 border-b border-border last:border-0"
                  >
                    {/* Image */}
                    <div className="relative w-20 h-20 flex-shrink-0 bg-secondary/50 rounded-md overflow-hidden">
                      <Image
                        src={item.specimen.image}
                        alt={item.specimen.name}
                        fill
                        sizes="80px"
                        className="object-contain p-2"

                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/specimen/${item.specimenId}`}
                        onClick={closeCart}
                        className="font-display text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {item.specimen.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {item.specimen.locality}
                      </p>
                      <p className="text-primary font-medium mt-2">
                        ${item.specimen.price?.toLocaleString()}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.specimenId)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${item.specimen.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-border space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl text-foreground">
                  ${subtotal.toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Shipping and taxes calculated at checkout
              </p>

              {/* Actions */}
              <div className="space-y-3">
                <Link href="/checkout" onClick={closeCart}>
                  <Button variant="hero" size="lg" className="w-full">
                    Checkout
                  </Button>
                </Link>
                <Button
                  variant="heroOutline"
                  size="lg"
                  className="w-full"
                  onClick={closeCart}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
