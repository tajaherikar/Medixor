"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { TopHeader } from "@/components/top-header";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuthStore, useSettingsStore } from "@/lib/stores";
import { setupAutoPreload } from "@/lib/preload";

interface TenantShellProps {
  tenant: string;
  children: React.ReactNode;
}

export function TenantShell({ tenant, children }: TenantShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { user, _hasHydrated } = useAuthStore();
  const { updateSettings } = useSettingsStore();
  const router = useRouter();

  // SECURITY: Redirect to login if not authenticated
  useEffect(() => {
    if (_hasHydrated && !user) {
      console.log('[Auth] User not authenticated, redirecting to login...');
      setIsRedirecting(true);
      router.replace("/login");
    }
  }, [user, _hasHydrated, router]);

  // Always load the correct tenant's settings on mount so switching accounts
  // never shows stale settings from a previously logged-in tenant.
  useEffect(() => {
    if (!_hasHydrated || !user) return;
    fetch(`/api/${tenant}/settings`, { credentials: 'same-origin' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) updateSettings(data); })
      .catch(() => {});
  }, [tenant, _hasHydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-preload all data for offline use
  useEffect(() => {
    if (!_hasHydrated || !user) return;
    
    console.log('🚀 Setting up auto-preload for tenant:', tenant);
    const cleanup = setupAutoPreload(tenant);
    
    return cleanup;
  }, [tenant, _hasHydrated, user]);

  // Show nothing while waiting for hydration
  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Block rendering if not authenticated
  if (!user || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Verify user belongs to this tenant
  if (user.tenantId !== tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this pharmacy account.
          </p>
          <p className="text-sm text-muted-foreground">
            Logged in as: <strong>{user.email}</strong> (Tenant: {user.tenantId})
            <br />
            Attempted to access: <strong>{tenant}</strong>
          </p>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.replace("/login");
            }}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Logout and Switch Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav
        tenant={tenant}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <TopHeader tenant={tenant} onMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto p-6 md:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
