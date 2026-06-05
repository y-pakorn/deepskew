import type { Metadata } from "next";
import { OpsGrid } from "@/components/terminal/tabs/ops-grid";

export const metadata: Metadata = { title: "Ops / Health" };

export default function OpsPage() {
  return <OpsGrid />;
}
