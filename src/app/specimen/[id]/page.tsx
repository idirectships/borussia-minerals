import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SpecimenGallery } from "@/components/specimen-gallery";
import { SpecimenSplatViewer } from "@/components/specimen-splat-viewer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { SpecimenPhotoStrip } from "@/components/specimen-photo-strip";
import { TrustSignals } from "@/components/trust-signals";
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

/** Spec rows to display in the grid */
function buildSpecs(specimen: {
  crystalSystem?: string;
  dimensions?: string;
  weight?: string;
  hardness?: string;
  luster?: string;
  transparency?: string;
}) {
  return [
    specimen.crystalSystem && { label: "Crystal System", value: specimen.crystalSystem },
    specimen.dimensions && { label: "Dimensions", value: specimen.dimensions },
    specimen.weight && { label: "Weight", value: specimen.weight },
    specimen.hardness && { label: "Hardness", value: specimen.hardness },
    specimen.luster && { label: "Luster", value: specimen.luster },
    specimen.transparency && { label: "Transparency", value: specimen.transparency },
  ].filter(Boolean) as { label: string; value: string }[];
}

export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specimen = await fetchSpecimenById(id);

  if (!specimen) {
    notFound();
  }

  const priceText = formatPrice(specimen);
  const canPurchase = isPurchasable(specimen);
  const hasSplat = Boolean(specimen.splatUrl);
  const specs = buildSpecs(specimen);
  const images = specimen.images ?? [specimen.image];

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
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
            <Link href="/shop" className="hover:text-primary transition-colors">
              Shop
            </Link>
            <ChevronRight className="w-3 h-3" />
            {specimen.mineralGroup && (
              <>
                <span className="text-muted-foreground/70">{specimen.mineralGroup}</span>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-foreground truncate max-w-[200px]">{specimen.name}</span>
          </nav>

          {/* === HERO: Two-column layout === */}
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
            {/* Left column: 3D viewer (primary) or gallery fallback */}
            <div className="space-y-4">
              <div className="relative">
                {hasSplat ? (
                  <SpecimenSplatViewer
                    splatUrl={specimen.splatUrl!}
                    initialCamera={specimen.splatCamera}
                    fallbackImage={specimen.image}
                  />
                ) : (
                  <SpecimenGallery
                    images={images}
                    name={specimen.name}
                  />
                )}

                {/* Availability badge */}
                {specimen.availability === "sold" && (
                  <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded z-10">
                    Sold
                  </div>
                )}
                {specimen.availability === "available" && hasSplat && (
                  <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded z-10">
                    Available
                  </div>
                )}
              </div>
            </div>

            {/* Right column: details panel */}
            <div className="space-y-6 lg:sticky lg:top-32 lg:self-start">
              {/* Mineral group micro-label + name */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-[0.25em] text-amber-500 font-medium">
                  {specimen.mineralGroup || "Mineral Specimen"}
                </span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight">
                  {specimen.name}
                </h1>
                {specimen.locality && (
                  <p className="text-muted-foreground text-sm">
                    {specimen.locality}
                  </p>
                )}
              </div>

              {/* Specs grid */}
              {specs.length > 0 && (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-5 border-t border-b border-border">
                  {specs.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                        {label}
                      </p>
                      <p className="text-sm text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Provenance */}
              {specimen.provenance && (
                <div className="py-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1">
                    Provenance
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {specimen.provenance}
                  </p>
                </div>
              )}

              {/* Price */}
              <div className="pt-2">
                <span
                  className={`font-display text-3xl ${
                    specimen.availability === "sold"
                      ? "text-muted-foreground line-through"
                      : "text-primary"
                  }`}
                >
                  {priceText}
                </span>
              </div>

              {/* CTA */}
              <AddToCartButton
                specimenId={specimen.id}
                canPurchase={canPurchase}
                availability={specimen.availability}
              />

              {/* Availability micro-text */}
              {specimen.availability === "available" && (
                <p className="text-xs text-muted-foreground/60 text-center">
                  One-of-a-kind specimen. Secure yours today.
                </p>
              )}
            </div>
          </div>

          {/* === BELOW THE FOLD === */}
          <div className="mt-16 space-y-12">
            {/* Photo gallery strip (when splat is hero, photos go here) */}
            {hasSplat && images.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
                  Photos
                </h2>
                <SpecimenPhotoStrip images={images} name={specimen.name} />
              </section>
            )}

            {/* Description / narrative */}
            {(specimen.description || specimen.narrative) && (
              <section className="max-w-3xl">
                <h2 className="font-display text-2xl text-foreground mb-4">
                  About This Specimen
                </h2>
                {specimen.narrative && (
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {specimen.narrative}
                  </p>
                )}
                {specimen.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {specimen.description}
                  </p>
                )}
              </section>
            )}

            {/* Trust signals */}
            <TrustSignals />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
