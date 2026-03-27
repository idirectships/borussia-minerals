"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/product-card";
import type { Specimen } from "@/types";

interface ShopGridProps {
  specimens: Specimen[];
}

export function ShopGrid({ specimens }: ShopGridProps) {
  const [filter, setFilter] = useState<"all" | "available" | "sold" | "private-collection">("all");
  const [mineralFilter, setMineralFilter] = useState<string | null>(null);

  // Extract unique mineral groups for filter pills
  const mineralGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const s of specimens) {
      if (s.mineralGroup) {
        groups.set(s.mineralGroup, (groups.get(s.mineralGroup) || 0) + 1);
      }
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1]); // sort by count desc
  }, [specimens]);

  const filtered = specimens.filter((s) => {
    if (filter !== "all" && s.availability !== filter) return false;
    if (mineralFilter && s.mineralGroup !== mineralFilter) return false;
    return true;
  });

  const availableCount = specimens.filter((s) => s.availability === "available").length;
  const soldCount = specimens.filter((s) => s.availability === "sold").length;
  const privateCount = specimens.filter((s) => s.availability === "private-collection").length;

  const pillClass = (active: boolean) =>
    `text-xs uppercase tracking-[0.2em] px-4 py-2 border rounded-full transition-colors whitespace-nowrap ${
      active
        ? "border-primary text-primary bg-primary/5"
        : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
    }`;

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {[
          { key: "all" as const, label: `All (${specimens.length})` },
          { key: "available" as const, label: `For Sale (${availableCount})` },
          { key: "sold" as const, label: `Sold (${soldCount})` },
          ...(privateCount > 0
            ? [{ key: "private-collection" as const, label: `Private (${privateCount})` }]
            : []),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={pillClass(filter === tab.key)}
          >
            {tab.label}
          </button>
        ))}

        {/* Mineral type divider + pills */}
        {mineralGroups.length > 1 && (
          <>
            <span className="text-border self-center">|</span>
            {mineralGroups.map(([group]) => (
              <button
                key={group}
                onClick={() =>
                  setMineralFilter(mineralFilter === group ? null : group)
                }
                className={pillClass(mineralFilter === group)}
              >
                {group}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
