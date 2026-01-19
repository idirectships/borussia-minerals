import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Ruler, Scale } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import {
  specimens,
  getSpecimenById,
  formatPrice,
  isPurchasable,
} from "@/lib/data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return specimens.map((specimen) => ({
    id: specimen.id,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const specimen = getSpecimenById(id);
  if (!specimen) {
    return { title: "Specimen Not Found | Borussia Minerals" };
  }
  return {
    title: `${specimen.name} | Borussia Minerals`,
    description: specimen.description,
  };
}

export default async function SpecimenPage({ params }: PageProps) {
  const { id } = await params;
  const specimen = getSpecimenById(id);

  if (!specimen) {
    notFound();
  }

  const priceText = formatPrice(specimen);
  const canPurchase = isPurchasable(specimen);

  // Related specimens (same mine or crystal system, excluding current)
  const related = specimens
    .filter(
      (s) =>
        s.id !== specimen.id &&
        s.availability === "available" &&
        (s.mineSlug === specimen.mineSlug ||
          s.crystalSystem === specimen.crystalSystem)
    )
    .slice(0, 3);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="relative pt-32 pb-8 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-7xl mx-auto">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </div>
      </section>

      {/* Product Detail */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Image Column */}
            <div className="relative">
              <div className="sticky top-32">
                <div className="silver-border matte-surface rounded-lg overflow-hidden">
                  <div className="relative aspect-square bg-secondary/30">
                    <Image
                      src={specimen.image}
                      alt={specimen.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain p-8"
                      priority
                    />
                    {specimen.availability === "sold" && (
                      <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground text-sm uppercase tracking-wider px-3 py-1 rounded">
                        Sold
                      </div>
                    )}
                    {specimen.mineSlug === "fat-jack" &&
                      specimen.availability === "available" && (
                        <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider px-2 py-1 rounded">
                          Fat Jack Mine
                        </div>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Info Column */}
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-4">
                <span className="text-accent uppercase text-xs tracking-[0.2em] font-medium">
                  {specimen.mineralGroup || specimen.crystalSystem}
                </span>
                <h1 className="font-display text-4xl md:text-5xl text-foreground">
                  {specimen.name}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{specimen.locality}</span>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-4">
                <div
                  className={`text-3xl font-display ${
                    specimen.availability === "sold"
                      ? "text-muted-foreground line-through"
                      : priceText === "Price on Request"
                        ? "text-accent"
                        : "text-primary"
                  }`}
                >
                  {priceText}
                </div>

                <AddToCartButton
                  specimenId={specimen.id}
                  canPurchase={canPurchase}
                  availability={specimen.availability}
                />
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h2 className="font-display text-xl text-foreground">
                  Description
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {specimen.description}
                </p>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h2 className="font-display text-xl text-foreground">
                  Specifications
                </h2>
                <div className="silver-border matte-surface rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        Crystal System
                      </span>
                      <p className="text-foreground mt-1">
                        {specimen.crystalSystem}
                      </p>
                    </div>
                    {specimen.mineralGroup && (
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Mineral Group
                        </span>
                        <p className="text-foreground mt-1">
                          {specimen.mineralGroup}
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Ruler className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          Dimensions
                        </span>
                        <p className="text-foreground mt-1">
                          {specimen.dimensions}
                        </p>
                      </div>
                    </div>
                    {specimen.weight && (
                      <div className="flex items-start gap-2">
                        <Scale className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Weight
                          </span>
                          <p className="text-foreground mt-1">
                            {specimen.weight}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {(specimen.luster || specimen.transparency) && (
                    <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                      {specimen.luster && (
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Luster
                          </span>
                          <p className="text-foreground mt-1">
                            {specimen.luster}
                          </p>
                        </div>
                      )}
                      {specimen.transparency && (
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            Transparency
                          </span>
                          <p className="text-foreground mt-1">
                            {specimen.transparency}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {specimen.provenance && (
                    <div className="border-t border-border pt-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        Provenance
                      </span>
                      <p className="text-foreground mt-1">
                        {specimen.provenance}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mine Link */}
              {specimen.mineSlug && (
                <div className="border-t border-border pt-6">
                  <Link
                    href={`/${specimen.mineSlug}`}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                  >
                    Learn about the{" "}
                    {specimen.mineSlug === "fat-jack"
                      ? "Fat Jack Mine"
                      : specimen.mineSlug}{" "}
                    →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Specimens */}
      {related.length > 0 && (
        <section className="py-16 px-6 md:px-12 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-2xl text-foreground mb-8">
              Related Specimens
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((s) => (
                <ProductCard key={s.id} specimen={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
