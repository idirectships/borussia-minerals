import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SpecimenGallery } from "@/components/specimen-gallery";
import { SpecimenCTASection } from "@/components/specimen-cta-section";
import { TierBadge, SplatBadge } from "@/components/tier-badge";
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
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Borussia Minerals",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [specimen, allSpecimens] = await Promise.all([
    fetchSpecimenById(id),
    fetchSpecimens(),
  ]);

  if (!specimen) {
    notFound();
  }

  const priceText = formatPrice(specimen);
  const canPurchase = isPurchasable(specimen);
  const isFromOwnMine = specimen.mineSlug === "fat-jack";

  // Related specimens: same mineral group or same locality, excluding current
  const related = allSpecimens
    .filter(
      (s) =>
        s.id !== specimen.id &&
        (s.mineralGroup === specimen.mineralGroup ||
          s.locality === specimen.locality)
    )
    .slice(0, 4);

  // Spec rows — show all available data
  const specs = [
    specimen.locality && { label: "Locality", value: specimen.locality },
    specimen.dimensions && { label: "Dimensions", value: specimen.dimensions },
    specimen.weight && { label: "Weight", value: specimen.weight },
    specimen.crystalSystem && { label: "Crystal System", value: specimen.crystalSystem },
    specimen.hardness && { label: "Hardness", value: specimen.hardness },
    specimen.luster && { label: "Luster", value: specimen.luster },
    specimen.transparency && { label: "Transparency", value: specimen.transparency },
    specimen.sizeClass && { label: "Size Class", value: specimen.sizeClass },
    specimen.provenance && { label: "Provenance", value: specimen.provenance },
  ].filter(Boolean) as { label: string; value: string }[];

  const additionalProperties = specs.map((s) => ({
    "@type": "PropertyValue" as const,
    name: s.label,
    value: s.value,
  }));

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

      <section className="relative pt-28 pb-16 px-6 md:px-12">
        <Navigation />

        <div className="max-w-7xl mx-auto">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left: Gallery */}
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
            </div>

            {/* Right: Details */}
            <div className="space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {specimen.tier && <TierBadge tier={specimen.tier} />}
                {specimen.splatUrl && <SplatBadge />}
                {specimen.availability === "available" && !specimen.tier && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-primary/10 text-primary border-primary/20">
                    Available
                  </span>
                )}
              </div>

              {/* Mineral type + Name */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium">
                  {specimen.mineralGroup || "Mineral Specimen"}
                </span>
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground">
                  {specimen.name}
                </h1>
              </div>

              {/* Description */}
              {specimen.description && (
                <p className="text-muted-foreground text-base leading-relaxed">
                  {specimen.description}
                </p>
              )}

              {/* Narrative (if exists) */}
              {specimen.narrative && (
                <p className="text-muted-foreground/80 text-sm leading-relaxed italic">
                  {specimen.narrative}
                </p>
              )}

              {/* Price */}
              <div className="pt-2">
                <span
                  className={`text-2xl md:text-3xl font-semibold font-body ${
                    specimen.availability === "sold"
                      ? "text-muted-foreground line-through"
                      : priceText === "Price on Request"
                        ? "text-foreground"
                        : "text-accent"
                  }`}
                >
                  {priceText}
                </span>
                {specimen.availability !== "sold" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Shipping from $45 · Fully insured
                  </p>
                )}
              </div>

              {/* CTA + Mobile Sticky Bar */}
              <SpecimenCTASection
                specimenId={specimen.id}
                specimenName={specimen.name}
                priceText={priceText}
                canPurchase={canPurchase}
                availability={specimen.availability}
              />

              {/* Specs Grid */}
              {specs.length > 0 && (
                <div className="border-t border-border pt-6 space-y-0">
                  {specs.map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between py-2.5 border-b border-border/50 text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground text-right max-w-[60%]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Trust Signals */}
              <div className="pt-4">
                <TrustSignals isFromOwnMine={isFromOwnMine} />
              </div>
            </div>
          </div>

          {/* Related Specimens */}
          {related.length > 0 && (
            <div className="mt-20 pt-12 border-t border-border">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
                More from this locality
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((s) => (
                  <Link
                    key={s.id}
                    href={`/specimen/${s.id}`}
                    className="group block"
                  >
                    <div className="silver-border matte-surface rounded-lg overflow-hidden transition-all duration-300 hover:shadow-silver">
                      <div className="relative aspect-square bg-secondary/30">
                        <img
                          src={s.image}
                          alt={s.name}
                          className="object-contain p-4 w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-display text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {s.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {s.locality}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
