import type { Metadata } from "next";
import { CrossVenueGrid } from "@/components/terminal/tabs/cross-venue-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Cross-Venue",
  description: OG_ROUTES["cross-venue"].description,
};

export default function CrossVenuePage() {
  return <CrossVenueGrid />;
}
