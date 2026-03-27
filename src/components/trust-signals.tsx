import { Shield, Package, Award, RotateCcw } from "lucide-react";

const SIGNALS = [
  {
    icon: Shield,
    title: "Authenticity Guaranteed",
    description: "Every specimen verified and documented with locality of origin.",
  },
  {
    icon: Package,
    title: "Secure Shipping",
    description: "Custom-packed with foam and double-boxed. Insured in transit.",
  },
  {
    icon: Award,
    title: "Collector Grade",
    description: "Hand-selected specimens. What you see in 3D is what you get.",
  },
  {
    icon: RotateCcw,
    title: "Satisfaction Policy",
    description: "Contact us within 7 days of delivery if anything is not as described.",
  },
] as const;

export function TrustSignals() {
  return (
    <section className="border-t border-border pt-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {SIGNALS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="text-center space-y-2">
            <Icon className="w-6 h-6 mx-auto text-primary/70" strokeWidth={1.5} />
            <h3 className="text-xs uppercase tracking-wider text-foreground font-medium">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
