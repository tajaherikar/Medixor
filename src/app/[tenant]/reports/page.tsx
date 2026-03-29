import { Reports } from "@/components/reports/reports";

interface ReportsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { tenant } = await params;
  return <Reports tenant={tenant} />;
}
