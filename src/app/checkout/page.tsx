"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/lib/cart-context";
import { CONTACT_EMAIL } from "@/lib/data";

type CheckoutStep = "review" | "contact" | "confirmation";

export default function CheckoutPage() {
  const { items, getSubtotal, clearCart } = useCart();
  const [step, setStep] = useState<CheckoutStep>("review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  // Snapshot items when entering confirmation to avoid race condition
  const submittedItemsRef = useRef<CartItem[]>([]);

  const subtotal = getSubtotal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    // In a real implementation, this would send to an API
    // For now, we'll simulate the inquiry submission

    // Create email body with cart items
    const itemList = items
      .map(
        (item) =>
          `- ${item.specimen.name} ($${item.specimen.price?.toLocaleString()})`
      )
      .join("\n");

    const mailtoBody = encodeURIComponent(
      `Name: ${formData.name}\nPhone: ${formData.phone}\n\nI am interested in purchasing the following specimens:\n\n${itemList}\n\nSubtotal: $${subtotal.toLocaleString()}\n\nAdditional notes:\n${formData.message}`
    );

    // Snapshot items before clearing
    submittedItemsRef.current = [...items];

    // Open email client
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=Purchase%20Inquiry&body=${mailtoBody}`;

    // Clear cart and move to confirmation
    clearCart();
    setStep("confirmation");
  };

  if (items.length === 0 && step !== "confirmation") {
    return (
      <main className="min-h-screen">
        <Navigation />
        <section className="pt-32 pb-16 px-6 md:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display text-4xl text-foreground mb-6">
              Your Cart is Empty
            </h1>
            <p className="text-muted-foreground mb-8">
              Add some specimens to your cart to proceed with checkout.
            </p>
            <Link href="/shop">
              <Button variant="hero" size="lg">
                Browse Shop
              </Button>
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navigation />

      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto">
          {step !== "confirmation" && (
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shop
            </Link>
          )}

          {/* Progress Steps */}
          {step !== "confirmation" && (
            <div className="flex items-center justify-center gap-4 mb-12">
              <div
                className={`flex items-center gap-2 ${step === "review" ? "text-primary" : "text-muted-foreground"}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${step === "review" ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  1
                </span>
                <span className="text-sm hidden sm:inline">Review</span>
              </div>
              <div className="w-8 h-px bg-border" />
              <div
                className={`flex items-center gap-2 ${step === "contact" ? "text-primary" : "text-muted-foreground"}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${step === "contact" ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  2
                </span>
                <span className="text-sm hidden sm:inline">Contact</span>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === "review" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="font-display text-3xl md:text-4xl text-foreground">
                  Review Your Selection
                </h1>
                <p className="text-muted-foreground mt-2">
                  Verify the specimens you&apos;d like to purchase
                </p>
              </div>

              <div className="silver-border matte-surface rounded-lg overflow-hidden">
                <div className="p-6 space-y-6">
                  {items.map((item) => (
                    <div
                      key={item.specimenId}
                      className="flex gap-4 pb-6 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="relative w-24 h-24 flex-shrink-0 bg-secondary/50 rounded-md overflow-hidden">
                        <Image
                          src={item.specimen.image}
                          alt={item.specimen.name}
                          fill
                          sizes="96px"
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-lg text-foreground">
                          {item.specimen.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.specimen.locality}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.specimen.dimensions}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-lg text-primary">
                          ${item.specimen.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 bg-secondary/30 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display text-2xl text-foreground">
                      ${subtotal.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Final price, shipping, and payment details will be
                    confirmed via email
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => setStep("contact")}
                >
                  Continue to Contact Info
                </Button>
              </div>
            </div>
          )}

          {/* Contact Step */}
          {step === "contact" && (
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="font-display text-3xl md:text-4xl text-foreground">
                  Contact Information
                </h1>
                <p className="text-muted-foreground mt-2">
                  We&apos;ll reach out to finalize your purchase
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="silver-border matte-surface rounded-lg p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="name"
                        className="text-sm text-muted-foreground"
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full bg-secondary/50 border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm text-muted-foreground"
                      >
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full bg-secondary/50 border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-sm text-muted-foreground"
                    >
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-secondary/50 border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="text-sm text-muted-foreground"
                    >
                      Additional Notes (optional)
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full bg-secondary/50 border border-border rounded-md px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Any questions or special requests..."
                    />
                  </div>
                </div>

                {/* Order Summary */}
                <div className="silver-border matte-surface rounded-lg p-6">
                  <h3 className="font-display text-lg text-foreground mb-4">
                    Order Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    {items.map((item) => (
                      <div
                        key={item.specimenId}
                        className="flex justify-between"
                      >
                        <span className="text-muted-foreground">
                          {item.specimen.name}
                        </span>
                        <span className="text-foreground">
                          ${item.specimen.price?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 border-t border-border">
                      <span className="text-foreground font-medium">
                        Subtotal
                      </span>
                      <span className="text-primary font-display text-lg">
                        ${subtotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-between">
                  <Button
                    type="button"
                    variant="heroOutline"
                    size="lg"
                    onClick={() => setStep("review")}
                  >
                    Back
                  </Button>
                  <Button type="submit" variant="hero" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Inquiry"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Confirmation Step */}
          {step === "confirmation" && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-accent" />
              </div>

              <div>
                <h1 className="font-display text-3xl md:text-4xl text-foreground">
                  Inquiry Submitted
                </h1>
                <p className="text-muted-foreground mt-4 max-w-md mx-auto">
                  Thank you for your interest! Your email client should have
                  opened with your inquiry details. If it didn&apos;t, please
                  email us directly at{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-primary hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24-48 hours to discuss pricing,
                  shipping, and payment options.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/shop">
                    <Button variant="heroOutline" size="lg">
                      Continue Shopping
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="hero" size="lg">
                      Return Home
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
