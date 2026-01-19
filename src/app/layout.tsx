import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { CartDrawer } from "@/components/cart-drawer";

export const metadata: Metadata = {
  title: "Borussia Minerals | Fine Mineral Specimens",
  description:
    "Borussia Minerals - Curating exceptional mineral specimens from around the world. Each piece selected for crystallographic perfection and natural beauty.",
  openGraph: {
    title: "Borussia Minerals",
    description:
      "Curating exceptional mineral specimens from around the world. Each piece selected for crystallographic perfection and natural beauty.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for Google Fonts - improves load performance */}
        {/* TODO: Migrate to next/font for better performance and no CLS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
