import { Dashboard } from "@/components/dashboard/dashboard";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant } = await params;

  return <Dashboard tenant={tenant} />;
}
