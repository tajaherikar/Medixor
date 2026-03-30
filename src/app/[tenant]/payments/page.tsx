import { OutstandingTracker } from "@/components/outstanding/outstanding-tracker";

interface PageProps {
  params: Promise<{ tenant: string }>;
}

export default async function PaymentsPage({ params }: PageProps) {
  const { tenant } = await params;

  return (
    <div className="max-w-6xl">
      <OutstandingTracker tenant={tenant} />
    </div>
  );
}
