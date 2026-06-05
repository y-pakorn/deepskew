import { ManagerDetail } from "@/components/terminal/managers/manager-detail";

export default async function ManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ManagerDetail managerId={id} />;
}
