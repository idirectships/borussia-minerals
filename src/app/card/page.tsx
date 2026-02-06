/* eslint-disable @next/next/no-img-element */
import { Calendar, MapPin, Clock } from "lucide-react";

export const metadata = {
  title: "The Daddy Pocket Release | Borussia Minerals",
  description:
    "You're invited to the Daddy Pocket Release at the Tucson Gem & Mineral Show. February 10th at 7 PM, Mineral City Building E, Room 2.",
};

export default function CardLandingPage() {
  return (
    <main className="h-[100dvh] bg-zinc-950 relative overflow-hidden">
      {/* Crystal image — width-driven, anchored to bottom */}
      <img
        src="/images/daddy-pocket-v2.jpg"
        alt="Amethyst scepter cluster from the Daddy Pocket - Fat Jack Mine"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] sm:w-[80vw] max-h-[70%] object-contain object-bottom"
      />

      {/* Invite Content — overlaps into crystal glow zone */}
      <div className="relative z-10 w-full px-6 pt-8 sm:pt-12 text-center space-y-3 sm:space-y-4">
        {/* Branding */}
        <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500 block">
          Borussia Minerals Presents
        </span>

        {/* Title */}
        <h1 className="font-display tracking-tight leading-none">
          <span className="block text-zinc-300 text-2xl sm:text-3xl mb-1">
            The
          </span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-100 to-purple-300 text-5xl sm:text-6xl whitespace-nowrap">
            Daddy Pocket
          </span>
          <span className="block text-zinc-400 text-lg sm:text-xl tracking-[0.2em] uppercase mt-2">
            Release
          </span>
        </h1>

        {/* Divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent mx-auto" />

        {/* Event Details */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-zinc-200">
            <Calendar className="w-4 h-4 text-purple-300/70" />
            <span className="text-lg font-display">February 10th</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4 text-purple-300/70" />
            <span className="text-sm">7:00 PM</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <MapPin className="w-4 h-4 text-purple-300/70" />
            <span className="text-sm">
              Mineral City &middot; Building E &middot; Room 2
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em]">
          Fat Jack Mine &middot; Tucson 2026
        </p>

        {/* Instagram CTA */}
        <a
          href="https://instagram.com/borussiaminerals"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[10px] text-zinc-500 hover:text-purple-300/80 transition-colors tracking-wide"
        >
          See what else comes out of the mountain →
        </a>
      </div>
    </main>
  );
}
