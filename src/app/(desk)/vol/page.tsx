import type { Metadata } from "next";
import { VolAnalyticsGrid } from "@/components/terminal/tabs/vol-analytics-grid";

export const metadata: Metadata = { title: "Vol Analytics" };

export default function VolPage() {
  return <VolAnalyticsGrid />;
}
