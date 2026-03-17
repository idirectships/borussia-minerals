import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { EventCard, type Event } from "@/components/event-card";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Upcoming Events | Borussia Minerals",
  description:
    "Find Borussia Minerals at mineral shows, auctions, and exhibitions around the world.",
};

const upcomingEvents: Event[] = [
  {
    title: "33rd Flagg Mineral Foundation — Minerals of Arizona Symposium",
    date: "2026-03-28",
    time: "8:00 AM - 5:00 PM",
    location: "Gilbert, Arizona",
    venue: "Southeast Regional Library, 775 N. Greenfield Rd., Gilbert, AZ 85234",
    description:
      "Arizona's premier mineral symposium featuring lectures on carbonates, mineral sales, and dealer exhibitions. Speakers include experts on Arizona calcites, rhodochrosite, and titanium minerals. Book signings by Wayne Thompson (Ikons).",
    type: "show",
    link: "https://flaggmineralfoundation.org/home/minerals-of-az-symposium/",
  },
];

const pastEvents: Event[] = [
  {
    title: "Tucson Gem & Mineral Show",
    date: "2025-02-13",
    time: "10:00 AM - 6:00 PM",
    location: "Tucson, Arizona",
    venue: "Tucson Convention Center",
    description:
      "The world's largest gem and mineral show. Visit our booth to view our latest acquisitions including exceptional wulfenite specimens from Arizona mines.",
    type: "show",
    link: "https://www.tgms.org/show",
  },
  {
    title: "Denver Gem & Mineral Show",
    date: "2025-09-12",
    time: "9:00 AM - 6:00 PM",
    location: "Denver, Colorado",
    venue: "Colorado Convention Center",
    description:
      "Join us at one of North America's premier mineral events. We'll be showcasing rare fluorite specimens and new additions to our collection.",
    type: "show",
    link: "https://www.denvergem.org",
  },
  {
    title: "Munich Mineral Show",
    date: "2025-10-24",
    time: "10:00 AM - 6:00 PM",
    location: "Munich, Germany",
    venue: "Messe München",
    description:
      "Europe's largest mineral fair. Explore our curated selection of world-class specimens from classic European localities.",
    type: "show",
  },
  {
    title: "Sainte-Marie-aux-Mines Show",
    date: "2024-06-27",
    time: "9:00 AM - 7:00 PM",
    location: "Sainte-Marie-aux-Mines, France",
    venue: "Various venues throughout town",
    description:
      "One of Europe's most prestigious mineral shows, known for exceptional European specimens and a unique village-wide atmosphere.",
    type: "show",
  },
];

export default function EventsPage() {
  return (
    <main className="min-h-screen">
      {/* Header Section */}
      <section className="relative pt-32 pb-16 px-6 md:px-12">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Find Us
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-silver-gradient animate-shimmer mt-4">
              Upcoming Events
            </h1>
            <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto">
              Meet us in person at mineral shows and exhibitions around the
              world. View our specimens up close and discuss additions to your
              collection.
            </p>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl text-foreground mb-8">
            Upcoming Shows
          </h2>
          <div className="space-y-6">
            {upcomingEvents.map((event) => (
              <EventCard key={`${event.title}-${event.date}`} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <section className="py-12 px-6 md:px-12 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-2xl text-muted-foreground mb-8">
              Past Events
            </h2>
            <div className="space-y-6 opacity-60">
              {pastEvents.map((event) => (
                <EventCard key={`${event.title}-${event.date}`} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl text-foreground mb-4">
            Can&apos;t make it to an event?
          </h2>
          <p className="text-muted-foreground mb-8">
            Contact us directly to discuss specimens or arrange a private
            viewing.
          </p>
          <Link
            href="/#contact"
            className="text-primary hover:text-primary/80 transition-colors text-lg"
          >
            Get in Touch →
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
