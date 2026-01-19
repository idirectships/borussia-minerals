import Link from "next/link";
import Image from "next/image";
import { Instagram } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { SpecimenCard } from "@/components/specimen-card";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { specimens as allSpecimens, CONTACT_EMAIL, INSTAGRAM_HANDLE } from "@/lib/data";

// Featured specimens for the home page collection section
const featuredSpecimens = allSpecimens.filter((s) => s.featured);

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section - Centered Showcase */}
      <section className="relative min-h-screen flex items-center">
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <Navigation />

        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div className="space-y-8 order-2 lg:order-1">
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Fine Mineral Specimens
                </span>
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-silver-gradient animate-shimmer">
                  Borussia Minerals
                </h1>
              </div>

              <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
                Museum-quality mineral specimens from around the world.
                Arizona wulfenite from our own Fat Jack Mine.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/shop">
                  <Button variant="hero" size="lg">
                    View Collection
                  </Button>
                </Link>
                <Link href="#contact">
                  <Button variant="heroOutline" size="lg">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image - The Star */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="relative aspect-[3/4] w-full max-w-md">
                <Image
                  src="/images/wulfenite-hero.jpg"
                  alt="Museum-quality Wulfenite on Matrix - Borussia Minerals signature specimen"
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 448px"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-muted-foreground/40 to-transparent" />
        </div>
      </section>

      {/* Collection Section */}
      <section id="collection" className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Signature Pieces
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-silver-gradient animate-shimmer mt-4">
              The Collection
            </h2>
          </div>

          <div className="space-y-12">
            {featuredSpecimens.map((specimen, index) => (
              <SpecimenCard
                key={specimen.name}
                specimen={specimen}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 md:px-12 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Our Philosophy
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-silver-gradient animate-shimmer mt-4 mb-8">
            About Borussia Minerals
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            At Borussia Minerals, we believe exceptional specimens deserve
            exceptional presentation. Founded with a passion for mineralogy and
            an eye for the extraordinary, we source pieces that exemplify the
            pinnacle of natural crystalline beauty. Each specimen in our
            collection is carefully selected for its scientific significance,
            aesthetic appeal, and provenance.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        className="py-24 px-6 md:px-12 border-t border-border"
      >
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Get In Touch
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-silver-gradient animate-shimmer mt-4 mb-8">
            Contact
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Interested in acquiring a piece for your collection? We welcome
            inquiries from serious collectors and institutions.
          </p>

          <div className="flex flex-col items-center gap-6">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:text-primary/80 transition-colors text-lg"
            >
              {CONTACT_EMAIL}
            </a>

            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="heroOutline" size="lg">
                <Instagram className="w-4 h-4" />
                @{INSTAGRAM_HANDLE}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
