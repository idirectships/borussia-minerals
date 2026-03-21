import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SpecimenGallery } from "@/components/specimen-gallery";
import { SpecimenSplatViewer } from "@/components/specimen-splat-viewer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { fetchSpecimens, fetchSpecimenById } from "@/lib/google-sheets";
import { formatPrice, isPurchasable } from "@/lib/utils";
import JsonLd from "@/components/JsonLd";

export const revalidate = 60;

export async function generateStaticParams() {
  const specimens = await fetchSpecimens();
  return specimens.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specimen = await fetchSpecimenById(id);
  if (!specimen) return { title: "Specimen Not Found | Borussia Minerals" };

  const title = `${specimen.name} | Borussia Minerals`;
  const description = specimen.description || `${specimen.name} mineral specimen from ${specimen.locality}`;
  const canonicalUrl = `https://borussiaminerals.com/specimen/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Borussia Minerals",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specimen = await fetchSpecimenById(id);

  if (!specimen) {
    notFound();
  }

  const priceText = formatPrice(specimen);
  const canPurchase = isPurchasable(specimen);

  const additionalProperties = [
    specimen.locality && {
      "@type": "PropertyValue",
      name: "Locality",
      value: specimen.locality,
    },
    specimen.crystalSystem && {
      "@type": "PropertyValue",
      name: "Crystal System",
      value: specimen.crystalSystem,
    },
    specimen.dimensions && {
      "@type": "PropertyValue",
      name: "Dimensions",
      value: specimen.dimensions,
    },
    specimen.weight && {
      "@type": "PropertyValue",
      name: "Weight",
      value: specimen.weight,
    },
    specimen.luster && {
      "@type": "PropertyValue",
      name: "Luster",
      value: specimen.luster,
    },
  ].filter(Boolean);

  return (
    <main className="min-h-screen">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: specimen.name,
          description:
            specimen.description ||
            `${specimen.name} mineral specimen from ${specimen.locality}`,
          image: specimen.image,
          brand: { "@type": "Brand", name: "Borussia Minerals" },
          category: "Mineral Specimens",
          offers: {
            "@type": "Offer",
            ...(specimen.price != null && { price: specimen.price }),
            priceCurrency: "USD",
            availability:
              specimen.availability === "sold"
                ? "https://schema.org/SoldOut"
                : "https://schema.org/InStock",
            url: `https://borussiaminerals.com/specimen/${specimen.id}`,
          },
          ...(additionalProperties.length > 0 && {
            additionalProperty: additionalProperties,
          }),
        }}
      />

      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
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

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Image / Gallery */}
            <div className="space-y-6">
              <div className="relative">
                <SpecimenGallery
                  images={specimen.images ?? [specimen.image]}
                  name={specimen.name}
                />
                {specimen.availability === "sold" && (
                  <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded z-10">
                    Sold
                  </div>
                )}
                {specimen.availability === "available" && (
                  <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded z-10">
                    Available
                  </div>
                )}
              </div>

              {specimen.splatUrl && (
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-3">
                    3D View
                  </p>
                  <SpecimenSplatViewer
                    splatUrl={specimen.splatUrl}
                    initialCamera={specimen.splatCamera}
                  />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-[0.2em] text-accent">
                  {specimen.mineralGroup || "Mineral Specimen"}
                </span>
                <h1 className="font-display text-4xl md:text-5xl text-foreground">
                  {specimen.name}
                </h1>
              </div>

              {specimen.description && (
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {specimen.description}
                </p>
              )}

              {/* Specs */}
              <div className="space-y-3 py-6 border-t border-b border-border">
                {specimen.locality && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Locality</span>
                    <span className="text-foreground">{specimen.locality}</span>
                  </div>
                )}
                {specimen.crystalSystem && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crystal System</span>
                    <span className="text-foreground">{specimen.crystalSystem}</span>
                  </div>
                )}
                {specimen.dimensions && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="text-foreground">{specimen.dimensions}</span>
                  </div>
                )}
                {specimen.weight && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weight</span>
                    <span className="text-foreground">{specimen.weight}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center justify-between">
                <span className={`font-display text-3xl ${
                  specimen.availability === "sold"
                    ? "text-muted-foreground line-through"
                    : "text-primary"
                }`}>
                  {priceText}
                </span>
              </div>

              {/* Purchase / Inquire CTA */}
              <AddToCartButton
                specimenId={specimen.id}
                canPurchase={canPurchase}
                availability={specimen.availability}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
