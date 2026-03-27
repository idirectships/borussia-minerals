import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { MineHero } from "@/components/mine-hero";
import { MineInfo } from "@/components/mine-info";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/tier-badge";
import { getMineBySlug } from "@/lib/data";
import { getPageCopy } from "@/lib/google-copy";
import { fetchSpecimens } from "@/lib/google-sheets";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export const metadata = {
  title: "Fat Jack Mine | Borussia Minerals",
  description:
    "Learn about the Fat Jack Mine in Arizona's Bradshaw Mountains - a historic source of exceptional wulfenite specimens now owned by Borussia Minerals.",
  alternates: {
    canonical: "https://borussiaminerals.com/fat-jack",
  },
};

export default async function FatJackPage() {
  const [mine, copy, allSpecimens] = await Promise.all([
    Promise.resolve(getMineBySlug("fat-jack")),
    getPageCopy("fat-jack"),
    fetchSpecimens(),
  ]);

  // Fat Jack specimens: locality contains "Fat Jack" or mineSlug matches
  const fatJackSpecimens = allSpecimens.filter(
    (s) =>
      s.locality?.toLowerCase().includes("fat jack") ||
      s.mineSlug === "fat-jack"
  );

  if (!mine) {
    notFound();
  }

  // Override mine data with Sheet copy if available
  const mineWithCopy = {
    ...mine,
    history: copy.mine_history || mine.history,
    geology: copy.mine_geology || mine.geology,
    shortDescription: copy.mine_short_desc || mine.shortDescription,
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-7xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <MineHero mine={mineWithCopy} />
        </div>
      </section>

      {/* Mine Info */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <MineInfo mine={mineWithCopy} />
        </div>
      </section>

      {/* Specimens from Our Mine */}
      {fatJackSpecimens.length > 0 && (
        <section className="py-16 px-6 md:px-12 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Specimens from Our Mine
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
              {fatJackSpecimens.map((s) => (
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
                      {s.tier && (
                        <div className="absolute top-3 left-3">
                          <TierBadge tier={s.tier} />
                        </div>
                      )}
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
                          : "text-amber-500"
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

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl text-foreground mb-4">
            {copy.cta_heading || "Interested in Fat Jack specimens?"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {copy.cta_body || "We have access to material not available elsewhere. Get in touch to discuss specimens for your collection."}
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/shop">
              <Button variant="hero" size="lg">
                Browse Specimens
              </Button>
            </Link>
            <Link href="/#contact">
              <Button variant="heroOutline" size="lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
