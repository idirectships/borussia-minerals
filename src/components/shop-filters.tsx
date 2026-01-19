"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterState {
  mineSlug?: string;
  crystalSystem?: string;
  availability?: "available" | "sold" | "reserved";
  priceRange?: "under1000" | "1000to5000" | "over5000";
}

interface ShopFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  mines: { slug: string; name: string }[];
  crystalSystems: string[];
}

const priceRanges = [
  { value: "under1000", label: "Under $1,000" },
  { value: "1000to5000", label: "$1,000 - $5,000" },
  { value: "over5000", label: "$5,000+ / POA" },
] as const;

const availabilityOptions = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
] as const;

export function ShopFilters({
  filters,
  onFiltersChange,
  mines,
  crystalSystems,
}: ShopFiltersProps) {
  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      if (filters[key] === value) {
        // Toggle off if same value
        const newFilters = { ...filters };
        delete newFilters[key];
        onFiltersChange(newFilters);
      } else {
        onFiltersChange({ ...filters, [key]: value });
      }
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      {/* Active Filters / Clear Button */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {Object.keys(filters).length} filter
            {Object.keys(filters).length > 1 ? "s" : ""} active
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Mine Filter */}
      {mines.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
            Mine
          </h3>
          <div className="flex flex-wrap gap-2">
            {mines.map((mine) => (
              <button
                key={mine.slug}
                onClick={() => updateFilter("mineSlug", mine.slug)}
                aria-pressed={filters.mineSlug === mine.slug}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  filters.mineSlug === mine.slug
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {mine.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crystal System Filter */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Crystal System
        </h3>
        <div className="flex flex-wrap gap-2">
          {crystalSystems.map((system) => (
            <button
              key={system}
              onClick={() => updateFilter("crystalSystem", system)}
              aria-pressed={filters.crystalSystem === system}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filters.crystalSystem === system
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {system}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Price Range
        </h3>
        <div className="flex flex-wrap gap-2">
          {priceRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => updateFilter("priceRange", range.value)}
              aria-pressed={filters.priceRange === range.value}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filters.priceRange === range.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability Filter */}
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">
          Availability
        </h3>
        <div className="flex flex-wrap gap-2">
          {availabilityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFilter("availability", option.value)}
              aria-pressed={filters.availability === option.value}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                filters.availability === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
