import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Borussia Minerals | Fine Mineral Specimens",
  description:
    "Borussia Minerals - Museum-quality mineral specimens from Arizona's Fat Jack Mine.",
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
        {children}
      </body>
    </html>
  );
}
