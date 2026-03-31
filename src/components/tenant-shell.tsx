"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopHeader } from "@/components/top-header";
import { useAuthStore, useSettingsStore } from "@/lib/stores";

interface TenantShellProps {
  tenant: string;
  children: React.ReactNode;
}

export function TenantShell({ tenant, children }: TenantShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, _hasHydrated } = useAuthStore();
  const { updateSettings } = useSettingsStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !user) {
      router.replace("/login");
    }
  }, [user, _hasHydrated, router]);

  // Always load the correct tenant's settings on mount so switching accounts
  // never shows stale settings from a previously logged-in tenant.
  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetch(`/api/${tenant}/settings`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) updateSettings(data); })
      .catch(() => {});
  }, [tenant, _hasHydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!_hasHydrated) return null;
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        tenant={tenant}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopHeader tenant={tenant} onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
