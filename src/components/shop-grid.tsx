"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/product-card";
import type { Specimen } from "@/types";

interface ShopGridProps {
  specimens: Specimen[];
}

export function ShopGrid({ specimens }: ShopGridProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "sold">("all");
  const [mineralFilter, setMineralFilter] = useState<string | null>(null);

  // Extract unique mineral groups for filter pills
  const mineralGroups = useMemo(() => {
    const groups = new Set<string>();
    specimens.forEach((s) => {
      if (s.mineralGroup) groups.add(s.mineralGroup);
    });
    return Array.from(groups).sort();
  }, [specimens]);

  const filtered = useMemo(() => {
    return specimens.filter((s) => {
      if (statusFilter !== "all" && s.availability !== statusFilter) return false;
      if (mineralFilter && s.mineralGroup !== mineralFilter) return false;
      return true;
    });
  }, [specimens, statusFilter, mineralFilter]);

  const availableCount = specimens.filter((s) => s.availability === "available").length;
  const soldCount = specimens.filter((s) => s.availability === "sold").length;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {/* Status filters */}
        {(
          [
            { key: "all" as const, label: `All (${specimens.length})` },
            { key: "available" as const, label: `Available (${availableCount})` },
            { key: "sold" as const, label: `Sold (${soldCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border rounded-full transition-colors ${
              statusFilter === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Divider */}
        {mineralGroups.length > 0 && (
          <div className="w-px h-5 bg-border mx-1" />
        )}

        {/* Mineral group filters */}
        {mineralGroups.map((group) => (
          <button
            key={group}
            onClick={() =>
              setMineralFilter(mineralFilter === group ? null : group)
            }
            className={`text-[11px] uppercase tracking-[0.15em] px-3 py-1.5 border rounded-full transition-colors ${
              mineralFilter === group
                ? "border-accent text-accent bg-accent/5"
                : "border-border/60 text-muted-foreground/70 hover:border-primary/40 hover:text-primary"
            }`}
          >
            {group}
          </button>
        ))}

        {/* Clear filter */}
        {mineralFilter && (
          <button
            onClick={() => setMineralFilter(null)}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grid — 4 cols desktop, 2 tablet, 1 mobile */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
