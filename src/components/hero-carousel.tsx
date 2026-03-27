"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface HeroSlide {
  id: string;
  name: string;
  locality: string;
  image: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  interval?: number;
}

export function HeroCarousel({ slides, interval = 5000 }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback(
    (index: number) => {
      setActiveIndex(index % slides.length);
    },
    [slides.length]
  );

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, slides.length, interval]);

  if (slides.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative aspect-[3/4] w-full max-w-md"
        style={{
          maskImage:
            "radial-gradient(ellipse 90% 95% at 50% 45%, black 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 95% at 50% 45%, black 60%, transparent 100%)",
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-roledescription="carousel"
        aria-label="Featured mineral specimens"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              i === activeIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${slide.name}`}
            aria-hidden={i !== activeIndex}
          >
            <Image
              src={slide.image}
              alt={slide.name}
              fill
              priority={i === 0}
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
            />
          </div>
        ))}

        {/* Specimen label */}
        <div className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/80 transition-opacity duration-500">
            {slides[activeIndex].name}
          </p>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground/50 mt-0.5">
            {slides[activeIndex].locality}
          </p>
        </div>
      </div>

      {/* Dot navigation */}
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(i)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i === activeIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`View ${slide.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
