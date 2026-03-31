import { Settings } from "@/components/settings/settings";

interface SettingsPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { tenant } = await params;
  return <Settings tenant={tenant} />;
}
