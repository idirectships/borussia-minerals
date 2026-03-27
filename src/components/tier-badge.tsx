import { cn } from "@/lib/utils";

const tierStyles = {
  museum: "bg-amber-900/80 text-amber-300",
  collector: "bg-blue-900/60 text-blue-400",
  select: "bg-green-900/60 text-green-400",
  classic: "bg-zinc-700/60 text-zinc-400",
} as const;

type Tier = keyof typeof tierStyles;

export function TierBadge({ tier }: { tier: string | undefined }) {
  if (!tier || !(tier in tierStyles)) return null;

  const label =
    tier === "museum"
      ? "Museum Grade"
      : tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        tierStyles[tier as Tier]
      )}
    >
      {label}
    </span>
  );
}

export function SplatBadge() {
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-500/40">
      3D
    </span>
  );
}
