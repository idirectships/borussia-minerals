import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { MineHero } from "@/components/mine-hero";
import { MineInfo } from "@/components/mine-info";
import { Button } from "@/components/ui/button";
import { getMineBySlug } from "@/lib/data";
import { getPageCopy } from "@/lib/google-copy";

export const revalidate = 60;

export const metadata = {
  title: "Fat Jack Mine | Borussia Minerals",
  description:
    "Learn about the Fat Jack Mine in Arizona's Bradshaw Mountains - a historic source of exceptional wulfenite specimens now owned by Borussia Minerals.",
};

export default async function FatJackPage() {
  const mine = getMineBySlug("fat-jack");
  const copy = await getPageCopy("fat-jack");

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
