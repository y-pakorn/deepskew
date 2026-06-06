import type { MetadataRoute } from "next";
import { OG_ROUTE_PATHS } from "@/lib/og/meta";

const BASE = "https://deepskew.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = ["/", ...Object.values(OG_ROUTE_PATHS)];
  return paths.map((path) => ({
    url: `${BASE}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "hourly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
