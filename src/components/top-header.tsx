"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";

const routeLabels: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard",       subtitle: "Stock overview and expiry alerts" },
  inventory: { title: "Inventory",       subtitle: "Batch-level stock management" },
  suppliers: { title: "Supplier Bills",  subtitle: "Record incoming stock with batch details" },
  billing:   { title: "Create Invoice",  subtitle: "Select customer, add items, apply discounts" },
  customers: { title: "Customers",       subtitle: "Customer accounts and discount profiles" },
  reports:   { title: "Reports",         subtitle: "Expiry reports and stock analytics" },
};

interface TopHeaderProps {
  tenant: string;
  onMenuOpen?: () => void;
}

export function TopHeader({ tenant, onMenuOpen }: TopHeaderProps) {
  const pathname = usePathname();
  const segment = pathname.split("/").pop() ?? "dashboard";
  const meta = routeLabels[segment] ?? { title: segment, subtitle: "" };

  return (
    <header className="sticky top-0 z-10 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        {/* Hamburger + Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-muted hover:border-primary/40 hover:text-primary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h1
              className="text-lg font-bold leading-tight"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              {meta.title}
            </h1>
            {meta.subtitle && (
              <p className="text-xs text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                {meta.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Search"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick search…</span>
          </button>
          <button
            aria-label="Notifications"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-muted hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Bell className="h-4 w-4" />
          </button>
          {/* Tenant avatar */}
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold text-primary-foreground uppercase select-none"
            style={{ background: "var(--primary)" }}
          >
            {tenant.slice(0, 2)}
          </div>
        </div>
      </div>
    </header>
  );
}
