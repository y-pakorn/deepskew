import type { Metadata } from "next";
import { PlpRiskGrid } from "@/components/terminal/tabs/plp-risk-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Vault",
  description: OG_ROUTES.risk.description,
};

export default function RiskPage() {
  return <PlpRiskGrid />;
}
