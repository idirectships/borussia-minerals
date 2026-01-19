"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { CartButton } from "@/components/cart-button";

const navLinks = [
  { href: "/#collection", label: "Collection" },
  { href: "/shop", label: "Shop" },
  { href: "/fat-jack", label: "Fat Jack" },
  { href: "/events", label: "Events" },
  { href: "/#contact", label: "Contact" },
];

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-6 md:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded overflow-hidden">
            <Image
              src="/images/wulfenite-hero.jpg"
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <span className="font-display text-xl tracking-widest text-foreground group-hover:text-primary transition-colors">
            BORUSSIA
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <CartButton />
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-4 md:hidden">
          <CartButton />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-6 py-6 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block text-sm uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
