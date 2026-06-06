import type { Metadata } from "next";
import { FlowEdgeGrid } from "@/components/terminal/tabs/flow-edge-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Flow & Edge",
  description: OG_ROUTES.flow.description,
};

export default function FlowPage() {
  return <FlowEdgeGrid />;
}
