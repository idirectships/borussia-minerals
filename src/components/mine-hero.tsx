import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Mine } from "@/lib/data";

interface MineHeroProps {
  mine: Mine;
}

export function MineHero({ mine }: MineHeroProps) {
  return (
    <div className="relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="space-y-6">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Our Mine
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground">
              {mine.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{mine.location}</span>
          </div>

          {mine.established && (
            <div className="text-sm text-muted-foreground">
              Established {mine.established}
            </div>
          )}

          <p className="text-lg text-muted-foreground leading-relaxed">
            {mine.shortDescription}
          </p>

          {mine.minerals && mine.minerals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mine.minerals.map((mineral) => (
                <span
                  key={mineral}
                  className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-border text-muted-foreground"
                >
                  {mineral}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hero Image */}
        {mine.heroImage && (
          <div className="relative">
            <div className="silver-border matte-surface rounded-lg overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src={mine.heroImage}
                  alt={mine.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
