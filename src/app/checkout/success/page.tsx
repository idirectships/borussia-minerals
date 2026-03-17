"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <main className="min-h-screen">
      <Navigation />
      <section className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-4">
            Thank You
          </h1>
          <p className="text-muted-foreground text-lg mb-2">
            Your order has been confirmed.
          </p>
          <p className="text-muted-foreground mb-8">
            We&apos;ll send you a confirmation email with shipping details shortly.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/shop">
              <Button variant="hero" size="lg" className="w-full">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/">
              <Button variant="heroOutline" size="lg" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
