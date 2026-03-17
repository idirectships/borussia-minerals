"use client";

import { useState } from "react";
import Image from "next/image";

interface SpecimenGalleryProps {
  images: string[];
  name: string;
}

export function SpecimenGallery({ images, name }: SpecimenGalleryProps) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="silver-border matte-surface rounded-lg overflow-hidden">
        <div className="relative aspect-square bg-secondary/50">
          <Image
            key={images[active]}
            src={images[active]}
            alt={`${name} — view ${active + 1}`}
            fill
            priority={active === 0}
            className="object-contain p-8"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* Thumbnail strip — only show when multiple images */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-colors ${
                i === active
                  ? "border-primary"
                  : "border-border hover:border-muted-foreground"
              }`}
              aria-label={`View ${name} angle ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${name} thumbnail ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
