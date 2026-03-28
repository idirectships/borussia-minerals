import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D Specimen Viewer | Borussia Minerals",
  robots: "noindex, nofollow",
};

export default function SplatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
