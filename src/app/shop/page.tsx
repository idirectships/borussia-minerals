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
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl text-foreground">
              {copy.shop_heading || "Collection"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {copy.shop_intro || "Hand-selected mineral specimens from Arizona mines."}
            </p>
          </div>

          <ShopGrid specimens={specimens} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
