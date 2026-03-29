"use client";

import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopHeader } from "@/components/top-header";

interface TenantShellProps {
  tenant: string;
  children: React.ReactNode;
}

export function TenantShell({ tenant, children }: TenantShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
