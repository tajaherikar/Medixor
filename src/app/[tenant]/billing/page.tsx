import { InvoiceBuilder } from "@/components/invoice-builder/invoice-builder";

interface BillingPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { tenant } = await params;

  return (
    <div className="max-w-5xl">
      <InvoiceBuilder tenant={tenant} />
    </div>
  );
}
