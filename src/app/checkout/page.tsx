"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

export default function CheckoutPage() {
  const { items, clearCart } = useCart();

  useEffect(() => {
    if (items.length === 0) {
      window.location.href = "/shop";
      return;
    }

    async function createCheckoutSession() {
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              specimenId: item.specimenId,
            })),
          }),
        });

        const data = await response.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          console.error("Checkout error:", data.error);
          window.location.href = "/shop";
        }
      } catch (err) {
        console.error("Checkout failed:", err);
        window.location.href = "/shop";
      }
    }

    createCheckoutSession();
  }, [items, clearCart]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to secure checkout...</p>
      </div>
    </main>
  );
}
