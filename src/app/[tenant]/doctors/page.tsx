import { DoctorsList } from "@/components/doctors-list/doctors-list";

interface DoctorsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function DoctorsPage({ params }: DoctorsPageProps) {
  const { tenant } = await params;
  return (
    <div className="max-w-4xl">
      <DoctorsList tenant={tenant} />
    </div>
  );
}
