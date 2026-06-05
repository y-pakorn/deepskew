import type { Metadata } from "next";
import { ManagersGrid } from "@/components/terminal/tabs/managers-grid";

export const metadata: Metadata = { title: "Managers" };

export default function ManagersPage() {
  return <ManagersGrid />;
}
