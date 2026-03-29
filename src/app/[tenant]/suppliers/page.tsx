import { SupplierBillForm } from "@/components/supplier-bill-form/supplier-bill-form";

interface SuppliersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SuppliersPage({ params }: SuppliersPageProps) {
  const { tenant } = await params;

  return (
    <div className="max-w-4xl">
      <SupplierBillForm tenant={tenant} />
    </div>
  );
}
