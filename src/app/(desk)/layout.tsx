import { DeskShell } from "@/components/terminal/desk-shell";

/** Persistent desk frame for every route — providers + chrome mount once here. */
export default function DeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DeskShell>{children}</DeskShell>;
}
