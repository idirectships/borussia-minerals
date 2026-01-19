"use client";

import { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Filter } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { ShopFilters, type FilterState } from "@/components/shop-filters";
import { Button } from "@/components/ui/button";
import {
  specimens,
  mines,
  getUniqueCrystalSystems,
  PRICE_THRESHOLD,
} from "@/lib/data";
import { cn } from "@/lib/utils";

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const getFiltersFromURL = useCallback((): FilterState => {
    return {
      mineSlug: searchParams.get("mine") || undefined,
      crystalSystem: searchParams.get("crystal") || undefined,
      availability: (searchParams.get("status") as FilterState["availability"]) || undefined,
      priceRange: (searchParams.get("price") as FilterState["priceRange"]) || undefined,
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<FilterState>(getFiltersFromURL);
  const [showFilters, setShowFilters] = useState(false);

  // Sync filters to URL
  const updateFiltersWithURL = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      const params = new URLSearchParams();
      if (newFilters.mineSlug) params.set("mine", newFilters.mineSlug);
      if (newFilters.crystalSystem) params.set("crystal", newFilters.crystalSystem);
      if (newFilters.availability) params.set("status", newFilters.availability);
      if (newFilters.priceRange) params.set("price", newFilters.priceRange);
      const queryString = params.toString();
      router.replace(queryString ? `/shop?${queryString}` : "/shop", { scroll: false });
    },
    [router]
  );

  // Sync state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setFilters(getFiltersFromURL());
  }, [getFiltersFromURL]);

  const crystalSystems = useMemo(() => getUniqueCrystalSystems(), []);
  const mineOptions = useMemo(
    () => mines.map((m) => ({ slug: m.slug, name: m.name })),
    []
  );

  const filteredSpecimens = useMemo(() => {
    return specimens.filter((s) => {
      // Mine filter
      if (filters.mineSlug && s.mineSlug !== filters.mineSlug) return false;

      // Crystal system filter
      if (filters.crystalSystem && s.crystalSystem !== filters.crystalSystem)
        return false;

      // Availability filter
      if (filters.availability && s.availability !== filters.availability)
        return false;

      // Price range filter
      if (filters.priceRange) {
        const price = s.price;
        switch (filters.priceRange) {
          case "under1000":
            if (price === undefined || price >= 1000) return false;
            break;
          case "1000to5000":
            if (price === undefined || price < 1000 || price >= PRICE_THRESHOLD)
              return false;
            break;
          case "over5000":
            if (price !== undefined && price < PRICE_THRESHOLD) return false;
            break;
        }
      }

      return true;
    });
  }, [filters]);

  const availableCount = filteredSpecimens.filter(
    (s) => s.availability === "available"
  ).length;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="relative pt-32 pb-8 px-6 md:px-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
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

          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Available Specimens
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-silver-gradient animate-shimmer mt-4">
              Shop
            </h1>
            <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto">
              Browse our collection of exceptional mineral specimens. Each piece
              has been carefully selected for its crystallographic perfection
              and natural beauty.
            </p>
          </div>
        </div>
      </section>

      {/* Shop Content */}
      <section className="px-6 md:px-12 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6">
            <Button
              variant="heroOutline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full justify-center"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-8">
            {/* Filters Sidebar */}
            <aside
              className={cn(
                "lg:block",
                showFilters ? "block" : "hidden"
              )}
            >
              <div className="silver-border matte-surface rounded-lg p-6 sticky top-32">
                <h2 className="font-display text-lg text-foreground mb-6">
                  Filters
                </h2>
                <ShopFilters
                  filters={filters}
                  onFiltersChange={updateFiltersWithURL}
                  mines={mineOptions}
                  crystalSystems={crystalSystems}
                />
              </div>
            </aside>

            {/* Product Grid */}
            <div>
              {/* Results Count */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-muted-foreground">
                  {filteredSpecimens.length} specimen
                  {filteredSpecimens.length !== 1 ? "s" : ""}
                  {availableCount < filteredSpecimens.length && (
                    <span className="ml-1">
                      ({availableCount} available)
                    </span>
                  )}
                </span>
              </div>

              {filteredSpecimens.length > 0 ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredSpecimens.map((specimen) => (
                    <ProductCard key={specimen.id} specimen={specimen} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">
                    No specimens match your filters.
                  </p>
                  <Button
                    variant="heroOutline"
                    onClick={() => updateFiltersWithURL({})}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl text-foreground mb-4">
            Looking for something specific?
          </h2>
          <p className="text-muted-foreground mb-6">
            We have additional specimens not listed online. Contact us to
            discuss your collecting interests.
          </p>
          <Link href="/#contact">
            <Button variant="heroOutline" size="lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ShopContent />
    </Suspense>
  );
}
