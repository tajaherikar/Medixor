import { PaymentsDashboard } from "@/components/payments-dashboard/payments-dashboard";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function PaymentsPage({ params }: PageProps) {
  const { tenant } = await params;

  return (
    <div className="max-w-6xl">
      <PaymentsDashboard tenant={tenant} />
    </div>
  );
}
