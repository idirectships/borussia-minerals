import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/hooks/use-cart";

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://borussiaminerals.com"),
  title: "Borussia Minerals | Fine Mineral Specimens",
  description:
    "Borussia Minerals - Museum-quality mineral specimens from Arizona's Fat Jack Mine.",
  openGraph: {
    title: "Borussia Minerals",
    description:
      "Curating exceptional mineral specimens from around the world. Each piece selected for crystallographic perfection and natural beauty.",
    type: "website",
    siteName: "Borussia Minerals",
    locale: "en_US",
    url: "https://borussiaminerals.com",
    images: [
      {
        url: "/images/wulfenite-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Borussia Minerals - Museum-quality mineral specimens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Borussia Minerals",
    description:
      "Curating exceptional mineral specimens from around the world. Each piece selected for crystallographic perfection and natural beauty.",
    images: ["/images/wulfenite-hero.jpg"],
  },
  alternates: {
    canonical: "https://borussiaminerals.com",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  verification: {
    google: "HeXTPx06QCuVNi54gCtIWICUrn3Gqgvx5BM4ybuwlJI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorantGaramond.variable} ${montserrat.variable}`}>
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
