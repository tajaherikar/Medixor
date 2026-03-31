"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageSearch,
  Building2,
  ReceiptText,
  UserRound,
  BarChart3,
  Cross,
  X,
  Banknote,
  Users,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores";

const navItems = [
  { label: "Dashboard",    href: "dashboard",        icon: LayoutDashboard, description: "Overview & alerts" },
  { label: "Inventory",    href: "inventory",         icon: PackageSearch,   description: "Batch-level stock" },
  { label: "Suppliers",    href: "suppliers",         icon: Building2,       description: "Stock inward & GRN" },
  { label: "Billing",      href: "billing",           icon: ReceiptText,     description: "Create invoices" },
  { label: "Customers",    href: "customers",         icon: UserRound,       description: "Customer accounts" },
  { label: "Doctors",      href: "doctors",           icon: Stethoscope,     description: "Reference persons & targets" },
  { label: "Payments",     href: "payments",          icon: Banknote,        description: "Outstanding & collections" },
  { label: "Reports",      href: "reports",           icon: BarChart3,       description: "Analytics & GST" },
];

const adminNavItems = [
  { label: "Team Members", href: "settings/users",   icon: Users,           description: "Manage user access" },
];

interface SidebarNavProps {
  tenant: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

function SidebarContent({ tenant, onClose }: { tenant: string; onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const allNavItems = isAdmin ? [...navItems, ...adminNavItems] : navItems;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
            style={{ background: "var(--sidebar-primary)" }}
          >
            <Cross className="h-4 w-4" style={{ color: "var(--sidebar-primary-foreground)" }} />
          </div>
          <div>
            <span
              className="text-lg font-bold tracking-tight leading-none"
              style={{ fontFamily: "var(--font-jakarta), sans-serif", color: "var(--sidebar-foreground)" }}
            >
              Medixor
            </span>
            <span
              className="block text-xs capitalize leading-tight mt-0.5 font-medium"
              style={{ color: "var(--sidebar-primary)", opacity: 0.85 }}
            >
              {tenant}
            </span>
          </div>
        </div>
        {/* Close button — only shown in mobile drawer */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.55 0.02 240)" }}>
          Navigation
        </span>
      </div>

      {/* Nav items */}
      <nav className="px-3 flex-1 space-y-0.5">
        {allNavItems.map(({ label, href, icon: Icon }) => {
          const fullPath = `/${tenant}/${href}`;
          const isActive = pathname === fullPath || pathname.startsWith(`${fullPath}/`);
          return (
            <Link
              key={href}
              href={fullPath}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group"
              )}
              style={
                isActive
                  ? {
                      background: "var(--sidebar-primary)",
                      color: "var(--sidebar-primary-foreground)",
                    }
                  : {
                      color: "var(--sidebar-foreground)",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "var(--sidebar-accent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-accent-foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-foreground)";
                }
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 mt-auto" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <span className="text-xs" style={{ color: "oklch(0.45 0.02 240)" }}>
          Medixor v1.0.0
        </span>
      </div>
    </div>
  );
}

export function SidebarNav({ tenant, mobileOpen = false, onClose }: SidebarNavProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 h-screen sticky top-0"
        style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        <SidebarContent tenant={tenant} />
      </aside>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col md:hidden transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar)" }}
      >
      <SidebarContent tenant={tenant} onClose={onClose} />
      </aside>
    </>
  );
}
