import { Dashboard } from "@/components/dashboard/dashboard";

interface DashboardPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant } = await params;
  
  // Permission check is enforced in layout and middleware
  // If user doesn't have dashboard permission, they're redirected at the layout level

  return <Dashboard tenant={tenant} />;
}
