import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { MineHero } from "@/components/mine-hero";
import { MineInfo } from "@/components/mine-info";
import { Button } from "@/components/ui/button";
import { getMineBySlug } from "@/lib/data";

export const metadata = {
  title: "Fat Jack Mine | Borussia Minerals",
  description:
    "Learn about the Fat Jack Mine in Arizona's Bradshaw Mountains - a historic source of exceptional wulfenite specimens now owned by Borussia Minerals.",
};

export default function FatJackPage() {
  const mine = getMineBySlug("fat-jack");

  if (!mine) {
    notFound();
  }

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

          <MineHero mine={mine} />
        </div>
      </section>

      {/* Mine Info */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <MineInfo mine={mine} />
        </div>
      </section>

      {/* New Discovery Teaser */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-accent">
            New Discovery
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-silver-gradient animate-shimmer mt-4 mb-6">
            New Pocket Uncovered
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A significant new pocket has been discovered at the Fat Jack Mine.
            Details and specimens coming soon. Contact us for inquiries.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl text-foreground mb-4">
            Interested in Fat Jack specimens?
          </h2>
          <p className="text-muted-foreground mb-6">
            As owners of the Fat Jack Mine, we have access to material not
            available elsewhere. Contact us to discuss specimens for your
            collection.
          </p>
          <Link href="/#contact">
            <Button variant="hero" size="lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
