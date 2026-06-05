import type { Metadata } from "next";
import { CrossVenueGrid } from "@/components/terminal/tabs/cross-venue-grid";

export const metadata: Metadata = { title: "Cross-Venue" };

export default function CrossVenuePage() {
  return <CrossVenueGrid />;
}
