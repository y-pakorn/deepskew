import type { Metadata } from "next";
import { OpsGrid } from "@/components/terminal/tabs/ops-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Ops / Health",
  description: OG_ROUTES.ops.description,
};

export default function OpsPage() {
  return <OpsGrid />;
}
