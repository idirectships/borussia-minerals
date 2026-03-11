import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { fetchSpecimens, fetchSpecimenById } from "@/lib/google-sheets";
import { formatPrice } from "@/lib/utils";

export const revalidate = 60;

export async function generateStaticParams() {
  const specimens = await fetchSpecimens();
  return specimens.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specimen = await fetchSpecimenById(id);
  if (!specimen) return { title: "Specimen Not Found | Borussia Minerals" };
  return {
    title: `${specimen.name} | Borussia Minerals`,
    description: specimen.description || `${specimen.name} from ${specimen.locality}`,
  };
}

export default async function SpecimenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specimen = await fetchSpecimenById(id);

  if (!specimen) {
    notFound();
  }

  const priceText = formatPrice(specimen);

  return (
    <main className="min-h-screen">
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
            {/* Image */}
            <div className="silver-border matte-surface rounded-lg overflow-hidden">
              <div className="relative aspect-square bg-secondary/50">
                <Image
                  src={specimen.image}
                  alt={specimen.name}
                  fill
                  priority
                  className="object-contain p-8"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {specimen.availability === "sold" && (
                  <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded">
                    Sold
                  </div>
                )}
                {specimen.availability === "available" && (
                  <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground text-xs uppercase tracking-wider px-3 py-1.5 rounded">
                    Available
                  </div>
                )}
              </div>
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

              {/* Contact CTA */}
              {specimen.availability === "available" && (
                <Link href="/#contact">
                  <Button variant="hero" size="lg" className="w-full">
                    Inquire About This Specimen
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
