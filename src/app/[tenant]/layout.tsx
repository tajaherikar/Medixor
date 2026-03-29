import { TenantShell } from "@/components/tenant-shell";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = await params;

  return (
    <TenantShell tenant={tenant}>
      {children}
    </TenantShell>
  );
}
