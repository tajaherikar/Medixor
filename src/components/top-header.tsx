"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Search, Menu, LogOut, AlertTriangle, PackageX, ReceiptText } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { mockBatches, mockInvoices } from "@/lib/mock/data";
import { SearchModal } from "@/components/search-modal";

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
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const segment = pathname.split("/").pop() ?? "dashboard";
  const meta = routeLabels[segment] ?? { title: segment, subtitle: "" };

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search modal
  const [searchOpen, setSearchOpen] = useState(false);

  // Notifications panel
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Build notifications from mock data
  const notifications = [
    ...mockBatches
      .filter((b) => b.status === "expired" && b.availableQty > 0)
      .map((b) => ({
        id: b.id,
        icon: <PackageX className="h-4 w-4 text-red-500 shrink-0" />,
        title: `${b.itemName} expired`,
        sub: `Batch ${b.batchNumber} · ${b.availableQty} units remaining`,
        type: "error" as const,
      })),
    ...mockBatches
      .filter((b) => b.status === "near_expiry" && b.availableQty > 0)
      .map((b) => ({
        id: b.id,
        icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
        title: `${b.itemName} expiring soon`,
        sub: `Batch ${b.batchNumber} · Exp ${b.expiryDate}`,
        type: "warn" as const,
      })),
    ...mockInvoices
      .filter((inv) => inv.paymentStatus === "unpaid")
      .map((inv) => ({
        id: inv.id,
        icon: <ReceiptText className="h-4 w-4 text-orange-500 shrink-0" />,
        title: `Unpaid invoice — ${inv.customerName}`,
        sub: `₹${inv.grandTotal.toLocaleString("en-IN")} due ${inv.dueDate}`,
        type: "warn" as const,
      })),
    ...mockInvoices
      .filter((inv) => inv.paymentStatus === "partial")
      .map((inv) => ({
        id: inv.id,
        icon: <ReceiptText className="h-4 w-4 text-blue-500 shrink-0" />,
        title: `Partial payment — ${inv.customerName}`,
        sub: `₹${(inv.grandTotal - inv.paidAmount).toLocaleString("en-IN")} still outstanding`,
        type: "info" as const,
      })),
  ];

  // Cmd+K shortcut for search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
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
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick search…</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-xs text-muted-foreground border border-border bg-background rounded px-1 py-0.5 font-mono ml-2">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-muted hover:border-primary/40 hover:text-primary transition-colors"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white bg-red-500">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-semibold">Notifications</span>
                  {notifications.length > 0 && (
                    <span className="text-xs text-muted-foreground">{notifications.length} alerts</span>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">All clear — no alerts</p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors">
                        <span className="mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.sub}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {/* User dropdown */}
          {user && (
            <div ref={dropdownRef} className="relative pl-2 border-l border-border">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
                aria-haspopup="true"
                aria-expanded={open}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold uppercase shrink-0 text-primary-foreground"
                  style={{ background: "var(--primary)" }}
                >
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <p className="text-xs font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-card shadow-lg z-50 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-muted transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>

    {searchOpen && (
      <SearchModal tenant={tenant} onClose={() => setSearchOpen(false)} />
    )}
    </>
  );
}
