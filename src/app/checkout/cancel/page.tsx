import Link from "next/link";
import { XCircle } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <section className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-display text-3xl md:text-4xl text-foreground mb-4">
            Checkout Cancelled
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            No worries — your cart is still saved. Come back when you&apos;re ready.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/shop">
              <Button variant="hero" size="lg" className="w-full">
                Return to Shop
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
