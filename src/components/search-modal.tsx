"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PackageSearch, UserRound, Building2, X } from "lucide-react";
import { mockBatches, mockCustomers, mockSuppliers } from "@/lib/mock/data";

interface Result {
  id: string;
  label: string;
  sub: string;
  category: "Inventory" | "Customer" | "Supplier";
  icon: React.ReactNode;
  href: string;
}

interface SearchModalProps {
  tenant: string;
  onClose: () => void;
}

export function SearchModal({ tenant, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Press Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const results: Result[] = q.length < 1 ? [] : [
    ...mockBatches
      .filter(
        (b) =>
          b.itemName.toLowerCase().includes(q) ||
          b.batchNumber.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((b) => ({
        id: b.id,
        label: b.itemName,
        sub: `Batch ${b.batchNumber} · Qty ${b.availableQty} · Exp ${b.expiryDate}`,
        category: "Inventory" as const,
        icon: <PackageSearch className="h-4 w-4" />,
        href: `/${tenant}/inventory`,
      })),
    ...mockCustomers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q)
      )
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        label: c.name,
        sub: c.phone ?? "",
        category: "Customer" as const,
        icon: <UserRound className="h-4 w-4" />,
        href: `/${tenant}/customers`,
      })),
    ...mockSuppliers
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        label: s.name,
        sub: s.email ?? s.phone ?? "",
        category: "Supplier" as const,
        icon: <Building2 className="h-4 w-4" />,
        href: `/${tenant}/suppliers`,
      })),
  ];

  function go(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inventory, customers, suppliers…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => go(r.href)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground shrink-0">{r.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">{r.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{r.sub}</span>
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                    {r.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.length > 0 && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">No results for &ldquo;{query}&rdquo;</p>
        )}

        {q.length === 0 && (
          <p className="px-4 py-5 text-xs text-muted-foreground text-center">
            Type to search inventory, customers, or suppliers
          </p>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono">↵</kbd> to navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
