import type { Metadata } from "next";
import { FlowEdgeGrid } from "@/components/terminal/tabs/flow-edge-grid";

export const metadata: Metadata = { title: "Flow & Edge" };

export default function FlowPage() {
  return <FlowEdgeGrid />;
}
