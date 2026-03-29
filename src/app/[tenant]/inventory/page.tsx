import { InventoryTable } from "@/components/inventory-table/inventory-table";

interface InventoryPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function InventoryPage({ params }: InventoryPageProps) {
  const { tenant } = await params;

  return <InventoryTable tenant={tenant} />;
}
