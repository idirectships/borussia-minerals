import { cn } from "@/lib/utils";

type Tier = "museum" | "collector" | "select" | "classic";

const tierConfig: Record<Tier, { label: string; className: string }> = {
  museum: {
    label: "Museum Grade",
    className: "bg-amber-900/60 text-amber-300 border-amber-700/40",
  },
  collector: {
    label: "Collector",
    className: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  },
  select: {
    label: "Select",
    className: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  },
  classic: {
    label: "Classic",
    className: "bg-secondary text-muted-foreground border-border",
  },
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const config = tierConfig[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

interface SplatBadgeProps {
  className?: string;
}

export function SplatBadge({ className }: SplatBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border bg-violet-900/30 text-violet-300 border-violet-700/40",
        className
      )}
    >
      3D
    </span>
  );
}
