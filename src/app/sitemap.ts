import type { MetadataRoute } from "next";
import { fetchSpecimens } from "@/lib/google-sheets";

const BASE_URL = "https://borussiaminerals.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const specimens = await fetchSpecimens();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/fat-jack`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const specimenRoutes: MetadataRoute.Sitemap = specimens.map((specimen) => ({
    url: `${BASE_URL}/specimen/${specimen.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...specimenRoutes];
}
