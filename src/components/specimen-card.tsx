"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Specimen } from "@/lib/data";

interface SpecimenCardProps {
  specimen: Specimen;
  index: number;
}

export function SpecimenCard({ specimen, index }: SpecimenCardProps) {
  const isEven = index % 2 === 1;

  return (
    <div className="silver-border matte-surface rounded-lg overflow-hidden">
      <div
        className={cn(
          "grid md:grid-cols-2 gap-8 p-6 md:p-10",
          isEven && "md:[direction:rtl]"
        )}
      >
        {/* Image Column */}
        <div className="flex items-center justify-center md:[direction:ltr]">
          <div className="relative max-w-xs md:max-w-sm w-full aspect-square" style={{ maskImage: "radial-gradient(ellipse 85% 85% at center, black 60%, transparent 100%)", WebkitMaskImage: "radial-gradient(ellipse 85% 85% at center, black 60%, transparent 100%)" }}>
            <Image
              src={specimen.image}
              alt={specimen.name}
              fill
              sizes="(max-width: 768px) 320px, 384px"
              className="object-contain"
              unoptimized={specimen.image.includes("drive.google.com")}
            />
          </div>
        </div>

        {/* Content Column */}
        <div className="flex flex-col justify-center space-y-6 md:[direction:ltr]">
          {/* Category Label */}
          <span className="text-accent uppercase text-xs tracking-[0.2em] font-medium">
            {specimen.featured ? "Featured Specimen" : "Fine Mineral"}
          </span>

          {/* Specimen Name */}
          <h3 className="font-display text-3xl md:text-4xl text-foreground">
            {specimen.name}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {specimen.description}
          </p>

          {/* Specs Table */}
          <div className="space-y-3 py-4 border-t border-b border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Locality</span>
              <span className="text-foreground">{specimen.locality}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Crystal System</span>
              <span className="text-foreground">{specimen.crystalSystem}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dimensions</span>
              <span className="text-foreground">{specimen.dimensions}</span>
            </div>
          </div>

          {/* CTA Button */}
          <div>
            <Link href={`/specimen/${specimen.id}`}>
              <Button variant="heroOutline" size="lg">
                View Details
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
