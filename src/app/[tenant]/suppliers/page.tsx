import { SuppliersList } from "@/components/suppliers-list/suppliers-list";
import { SupplierBillForm } from "@/components/supplier-bill-form/supplier-bill-form";

interface SuppliersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SuppliersPage({ params }: SuppliersPageProps) {
  const { tenant } = await params;

  return (
    <div className="space-y-8">
      <div className="max-w-6xl">
        <SuppliersList tenant={tenant} />
      </div>

      <div className="max-w-6xl">
        <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
          Record Supplier Bill (GRN)
        </h2>
        <SupplierBillForm tenant={tenant} />
      </div>
    </div>
  );
}
