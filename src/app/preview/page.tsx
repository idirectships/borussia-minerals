import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { fetchSpecimens } from "@/lib/google-sheets";

export const revalidate = 60;

// Simple token gate — not security-critical, just prevents casual discovery
const PREVIEW_TOKEN = "boris2026";

export const metadata: Metadata = {
  title: "Site Preview | Borussia Minerals",
  robots: "noindex, nofollow",
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  if (params.token !== PREVIEW_TOKEN) {
    redirect("/");
  }

  const specimens = await fetchSpecimens();

  const available = specimens.filter((s) => s.availability === "available");
  const sold = specimens.filter((s) => s.availability === "sold");

  return (
    <main className="min-h-screen">
      {/* Header */}
      <Navigation />

      {/* Section 1: Overview */}
      <section className="pt-32 pb-16 px-6 md:px-12 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 inline-block bg-accent/20 text-accent text-xs uppercase tracking-[0.2em] px-3 py-1.5 rounded">
            Private Preview
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-6">
            Site Preview for Boris
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            This page shows the current state of the Borussia Minerals website.
            Everything below is live — pulling from the Google Sheet inventory
            and copy. Scroll down to see each section.
          </p>

          {/* Status dashboard */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="silver-border matte-surface rounded-lg p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Total Specimens
              </div>
              <div className="font-display text-3xl text-primary">
                {specimens.length}
              </div>
            </div>
            <div className="silver-border matte-surface rounded-lg p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Available
              </div>
              <div className="font-display text-3xl text-accent">
                {available.length}
              </div>
            </div>
            <div className="silver-border matte-surface rounded-lg p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Sold
              </div>
              <div className="font-display text-3xl text-muted-foreground">
                {sold.length}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3">
            <a href="#specimens" className="text-xs uppercase tracking-[0.2em] text-primary border border-primary/30 px-4 py-2 rounded hover:bg-primary/10 transition-colors">
              Specimens
            </a>
            <a href="#pages" className="text-xs uppercase tracking-[0.2em] text-primary border border-primary/30 px-4 py-2 rounded hover:bg-primary/10 transition-colors">
              Site Pages
            </a>
            <a href="#photos" className="text-xs uppercase tracking-[0.2em] text-primary border border-primary/30 px-4 py-2 rounded hover:bg-primary/10 transition-colors">
              Photo Status
            </a>
            <a href="#next-steps" className="text-xs uppercase tracking-[0.2em] text-primary border border-primary/30 px-4 py-2 rounded hover:bg-primary/10 transition-colors">
              Next Steps
            </a>
          </div>
        </div>
      </section>

      {/* Section 2: All Specimens */}
      <section id="specimens" className="py-16 px-6 md:px-12 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl text-foreground mb-2">
            Specimen Inventory
          </h2>
          <p className="text-muted-foreground mb-8">
            All {specimens.length} specimens from the Google Sheet. Click any card to see the detail page.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specimens.map((specimen) => (
              <ProductCard key={specimen.id} specimen={specimen} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Site Pages */}
      <section id="pages" className="py-16 px-6 md:px-12 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-foreground mb-2">
            Site Pages
          </h2>
          <p className="text-muted-foreground mb-8">
            Direct links to every page on the site. All text is editable from the Google Sheet.
          </p>

          <div className="space-y-4">
            {[
              { href: "/", label: "Homepage", desc: "Hero, about section, contact form" },
              { href: "/shop", label: "Shop", desc: "Full inventory with filter tabs (All / Available / Sold)" },
              { href: "/fat-jack", label: "Fat Jack Mine", desc: "Mine history, geology, notable minerals" },
              { href: "/events", label: "Events", desc: "Upcoming mineral shows and events" },
            ].map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="block silver-border matte-surface rounded-lg p-4 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-lg text-foreground group-hover:text-primary transition-colors">
                      {page.label}
                    </span>
                    <p className="text-sm text-muted-foreground">{page.desc}</p>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Photo Status */}
      <section id="photos" className="py-16 px-6 md:px-12 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-foreground mb-2">
            Photo Status
          </h2>
          <p className="text-muted-foreground mb-8">
            Current state of specimen photography. Photos marked as needing reshoot
            should be taken on a clean background without hands or cards touching the specimen.
          </p>

          <div className="space-y-3">
            {specimens.map((specimen) => {
              const hasPhoto = specimen.image && !specimen.image.includes("wulfenite-hero");
              return (
                <div
                  key={specimen.id}
                  className="flex items-center justify-between silver-border matte-surface rounded-lg p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-secondary/50 flex-shrink-0">
                      <Image
                        src={specimen.image}
                        alt={specimen.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div>
                      <span className="text-sm text-foreground">{specimen.name}</span>
                      <p className="text-xs text-muted-foreground">{specimen.locality}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs uppercase tracking-wider px-3 py-1 rounded ${
                      hasPhoto
                        ? "bg-green-500/20 text-green-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {hasPhoto ? "Has Photo" : "Needs Photo"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 5: Next Steps */}
      <section id="next-steps" className="py-16 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl text-foreground mb-2">
            Next Steps
          </h2>
          <p className="text-muted-foreground mb-8">
            What&apos;s needed to get the store fully live.
          </p>

          <div className="space-y-6">
            <div className="silver-border matte-surface rounded-lg p-6">
              <h3 className="font-display text-xl text-accent mb-3">
                Photos Needed
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Most specimens need new photos taken on a clean, neutral background.
                The specimen should be on its display stand — no hands, no cards, no bowls in frame.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Take photos on a solid dark or white background
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Use natural or soft studio lighting — avoid harsh flash
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Multiple angles are great — front, side, detail of crystals
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Upload to the Google Drive &quot;Photos&quot; folder, one subfolder per specimen
                </li>
              </ul>
            </div>

            <div className="silver-border matte-surface rounded-lg p-6">
              <h3 className="font-display text-xl text-accent mb-3">
                Stripe Setup
              </h3>
              <p className="text-sm text-muted-foreground">
                Create a Stripe account at stripe.com to enable checkout.
                Once active, we&apos;ll wire it up for credit card payments with
                US shipping.
              </p>
            </div>

            <div className="silver-border matte-surface rounded-lg p-6">
              <h3 className="font-display text-xl text-accent mb-3">
                Copy Review
              </h3>
              <p className="text-sm text-muted-foreground">
                All text on the site can be edited directly in the Google Sheet
                (&quot;Copy&quot; tab). Change any heading, description, or label — the site
                updates automatically within 60 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
