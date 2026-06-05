import type { Metadata } from "next";
import { PlpRiskGrid } from "@/components/terminal/tabs/plp-risk-grid";

export const metadata: Metadata = { title: "PLP Risk" };

export default function RiskPage() {
  return <PlpRiskGrid />;
}
