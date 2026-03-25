"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Specimen } from "@/types";

interface ShopGridProps {
  specimens: Specimen[];
}

export function ShopGrid({ specimens }: ShopGridProps) {
  const [filter, setFilter] = useState<"all" | "available" | "sold">("all");

  const filtered = specimens.filter((s) => {
    if (filter === "all") return true;
    return s.availability === filter;
  });

  const availableCount = specimens.filter((s) => s.availability === "available").length;
  const soldCount = specimens.filter((s) => s.availability === "sold").length;

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex justify-center gap-4 mb-12">
        {[
          { key: "all" as const, label: `All (${specimens.length})` },
          { key: "available" as const, label: `Available (${availableCount})` },
          { key: "sold" as const, label: `Sold (${soldCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-xs uppercase tracking-[0.2em] px-4 py-2 border rounded transition-colors ${
              filter === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((specimen) => (
            <ProductCard key={specimen.id} specimen={specimen} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No specimens match this filter.</p>
        </div>
      )}
    </div>
  );
}
