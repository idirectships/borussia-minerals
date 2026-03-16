import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ShopGrid } from "@/components/shop-grid";
import JsonLd from "@/components/JsonLd";
import { fetchSpecimens } from "@/lib/google-sheets";
import { getPageCopy } from "@/lib/google-copy";

export const revalidate = 60; // ISR: revalidate every 60 seconds

export const metadata = {
  title: "Shop | Borussia Minerals",
  description:
    "Browse available mineral specimens from Borussia Minerals. Arizona wulfenite, azurite, cuprite, and more.",
  alternates: {
    canonical: "https://borussiaminerals.com/shop",
  },
};

export default async function ShopPage() {
  const [specimens, copy] = await Promise.all([
    fetchSpecimens(),
    getPageCopy("shop"),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Shop | Borussia Minerals",
    url: "https://borussiaminerals.com/shop",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: specimens.map((specimen, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: specimen.name,
        url: `https://borussiaminerals.com/specimen/${specimen.id}`,
      })),
    },
  };

  return (
    <main className="min-h-screen">
      <JsonLd data={jsonLd} />
      <section className="relative pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {copy.shop_label || "Collection"}
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-silver-gradient animate-shimmer mt-4 mb-6">
              {copy.shop_heading || "Available Specimens"}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {copy.shop_intro || "Browse our current inventory of mineral specimens. Each piece has been hand-selected for quality and character."}
            </p>
          </div>

          <ShopGrid specimens={specimens} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
