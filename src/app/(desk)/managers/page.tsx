import type { Metadata } from "next";
import { ManagersGrid } from "@/components/terminal/tabs/managers-grid";
import { OG_ROUTES } from "@/lib/og/meta";

export const metadata: Metadata = {
  title: "Managers",
  description: OG_ROUTES.managers.description,
};

export default function ManagersPage() {
  return <ManagersGrid />;
}
