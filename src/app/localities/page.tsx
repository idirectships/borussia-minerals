import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { AzMineMap } from "@/components/az-mine-map";
import { localities } from "@/data/localities";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Arizona Mine Localities | Borussia Minerals",
  description:
    "Interactive map of Arizona mine localities where Borussia Minerals specimens originate — Morenci, Ray Mine, Ajo, and more.",
  alternates: {
    canonical: "https://borussiaminerals.com/localities",
  },
};

export default function LocalitiesPage() {
  const totalSpecimens = localities.reduce(
    (sum, m) => sum + m.specimenIds.length,
    0
  );

  return (
    <main className="min-h-screen">
      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
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

          <div className="mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-accent">
              All Arizona
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mt-3 mb-4">
              Mine Localities
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Every specimen in the current collection originates from Arizona
              — home to some of the world&apos;s finest copper secondary
              minerals. {localities.length} localities, {totalSpecimens}{" "}
              specimens.
            </p>
          </div>

          <AzMineMap />
        </div>
      </section>

      <Footer />
    </main>
  );
}
