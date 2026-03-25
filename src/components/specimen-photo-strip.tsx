"use client";

import { useState } from "react";
import Image from "next/image";

interface SpecimenPhotoStripProps {
  images: string[];
  name: string;
}

export function SpecimenPhotoStrip({ images, name }: SpecimenPhotoStripProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setExpanded(i)}
            className="relative flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-colors group"
          >
            <Image
              src={src}
              alt={`${name} photo ${i + 1}`}
              fill
              className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
              sizes="192px"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {expanded !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setExpanded(null)}
          role="dialog"
          aria-label="Image preview"
        >
          <div className="relative w-full max-w-3xl max-h-[85vh] aspect-square mx-4">
            <Image
              src={images[expanded]}
              alt={`${name} photo ${expanded + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
          <button
            onClick={() => setExpanded(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl p-2"
            aria-label="Close"
          >
            &times;
          </button>

          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((expanded - 1 + images.length) % images.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-3xl p-2"
                aria-label="Previous"
              >
                &#8249;
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((expanded + 1) % images.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-3xl p-2"
                aria-label="Next"
              >
                &#8250;
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
