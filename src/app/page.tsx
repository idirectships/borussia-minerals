import Link from "next/link";
import Image from "next/image";
import { Instagram, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import JsonLd from "@/components/JsonLd";
import { CONTACT_EMAIL, INSTAGRAM_HANDLE } from "@/lib/data";
import { getPageCopy } from "@/lib/google-copy";
import { fetchSpecimens } from "@/lib/google-sheets";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export const metadata = {
  alternates: {
    canonical: "https://borussiaminerals.com",
  },
};

export default async function Home() {
  const [copy, specimens] = await Promise.all([
    getPageCopy("homepage"),
    fetchSpecimens(),
  ]);

  // Show up to 4 featured/available specimens
  const featured = specimens
    .filter((s) => s.availability === "available")
    .slice(0, 4);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Borussia Minerals",
    url: "https://borussiaminerals.com",
    logo: "https://borussiaminerals.com/images/wulfenite-hero.jpg",
    email: "borussiaminerals@gmail.com",
    description: "Quality mineral specimens from Arizona's Fat Jack Mine",
    sameAs: ["https://instagram.com/borussiaminerals"],
  };

  return (
    <main className="min-h-screen">
      <JsonLd data={orgJsonLd} />

      {/* Hero Section — tighter, specimen as star */}
      <section className="relative min-h-[85vh] flex items-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-12 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                  {copy.hero_label || "Rare Arizona Minerals"}
                </span>
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-silver-gradient animate-shimmer">
                  {copy.hero_heading || "Borussia Minerals"}
                </h1>
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
                {copy.hero_subheading || "Museum-quality specimens from our own Fat Jack Mine in Arizona's Bradshaw Mountains."}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/shop">
                  <Button variant="hero" size="lg">
                    View Collection
                  </Button>
                </Link>
                <Link href="/fat-jack">
                  <Button variant="heroOutline" size="lg">
                    {copy.hero_cta_2 || "Our Mine"}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <div
                className="relative aspect-[3/4] w-full max-w-md"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 80% 80% at center, black 50%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 80% 80% at center, black 50%, transparent 100%)",
                }}
              >
                <Image
                  src="/images/wulfenite-hero.jpg"
                  alt="Wulfenite on Matrix - Borussia Minerals signature specimen"
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Specimens */}
      {featured.length > 0 && (
        <section className="py-16 px-6 md:px-12 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Featured Specimens
              </h2>
              <Link
                href="/shop"
                className="text-xs uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
              >
                View All
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {featured.map((s) => (
                <Link
                  key={s.id}
                  href={`/specimen/${s.id}`}
                  className="group block"
                >
                  <div className="silver-border matte-surface rounded-lg overflow-hidden transition-all duration-300 hover:shadow-silver">
                    <div className="relative aspect-square bg-gradient-to-b from-secondary/30 to-transparent">
                      <Image
                        src={s.image}
                        alt={s.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-display text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {s.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {s.locality}
                      </p>
                      <p className={`text-sm font-semibold mt-1 ${
                        formatPrice(s) === "Price on Request"
                          ? "text-muted-foreground"
                          : "text-accent"
                      }`}>
                        {formatPrice(s)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* From Our Mine — story strip */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-[11px] uppercase tracking-[0.3em] text-accent">
                {copy.mine_label || "From Our Own Mine"}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground mt-3 mb-4">
                {copy.mine_heading || "The Fat Jack Mine"}
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {copy.mine_body ||
                  "Borussia Minerals acquired Arizona's historic Fat Jack Mine in 2025. Known for producing exceptional wulfenite with distinctive orange-red tabular crystals, the Fat Jack is one of the most celebrated mineral localities in the American Southwest."}
              </p>
              <Link href="/fat-jack">
                <Button variant="heroOutline" size="lg">
                  Read the Story
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-secondary/30">
              <Image
                src="/images/fat-jack-hero.jpg"
                alt="Fat Jack Mine, Yavapai County, Arizona"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Announcement (if exists) */}
      {copy.announcement && (
        <section className="py-4 px-6 md:px-12 border-t border-border/50">
          <div className="max-w-5xl mx-auto text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {copy.announcement}
            </span>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section
        id="contact"
        className="py-16 px-6 md:px-12 border-t border-border"
      >
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            {copy.contact_label || "Get In Touch"}
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-foreground mt-3 mb-6">
            {copy.contact_heading || "Contact"}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {copy.contact_body ||
              "Interested in acquiring a piece for your collection? We welcome inquiries from serious collectors and institutions."}
          </p>

          <div className="flex flex-col items-center gap-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:text-primary/80 transition-colors"
            >
              {CONTACT_EMAIL}
            </a>

            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="heroOutline" size="lg">
                <Instagram className="w-4 h-4" />
                @{INSTAGRAM_HANDLE}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
