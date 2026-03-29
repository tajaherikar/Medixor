import { CustomersList } from "@/components/customers-list/customers-list";

interface CustomersPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function CustomersPage({ params }: CustomersPageProps) {
  const { tenant } = await params;

  return (
    <div className="max-w-4xl">
      <CustomersList tenant={tenant} />
    </div>
  );
}
