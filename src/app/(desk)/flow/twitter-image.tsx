import { ogContentType, ogSize, renderRouteCard } from "@/lib/og/card";
import { OG_ROUTES } from "@/lib/og/meta";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = ogSize;
export const contentType = ogContentType;
export const alt = `deepskew · ${OG_ROUTES.flow.title}`;

export default function Image() {
  return renderRouteCard("flow");
}
