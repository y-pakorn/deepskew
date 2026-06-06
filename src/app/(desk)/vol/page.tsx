import type { Metadata } from "next";
import { VolAnalyticsGrid } from "@/components/terminal/tabs/vol-analytics-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Vol Analytics",
  description: OG_ROUTES.vol.description,
};

export default function VolPage() {
  return <VolAnalyticsGrid />;
}
