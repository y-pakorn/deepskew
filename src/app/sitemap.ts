import type { MetadataRoute } from "next";
import { OG_ROUTE_PATHS } from "@/lib/og/meta";

const BASE = "https://deepskew.xyz";

const DOCS_PATHS = [
  "/docs",
  "/docs/views",
  "/docs/math",
  "/docs/integration",
  "/docs/liquidity",
  "/docs/verify",
  "/docs/glossary",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const desk = ["/", ...Object.values(OG_ROUTE_PATHS)];
  return [
    ...desk.map((path) => ({
      url: `${BASE}${path === "/" ? "" : path}`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...DOCS_PATHS.map((path) => ({
      url: `${BASE}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
