"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  AlertCircle,
  XCircle,
  TrendingUp,
  FileText,
  Package2,
  IndianRupee,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Batch, Invoice } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge, StatusBadge } from "@/components/ui/expiry-badge";

interface ReportsProps {
  tenant: string;
}

type Tab = "expiry" | "valuation" | "movement" | "invoices";

const tabs: { key: Tab; label: string }[] = [
  { key: "expiry",    label: "Expiry Report" },
  { key: "valuation", label: "Stock Valuation" },
  { key: "movement",  label: "Stock Movement" },
  { key: "invoices",  label: "Invoices" },
];

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function shortName(name: string) {
  return name.replace(/ \d+(mg|ml)$/i, "");
}

export function Reports({ tenant }: ReportsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("expiry");

  const { data: batches = [], isLoading: batchLoading } = useQuery<Batch[]>({
    queryKey: ["inventory", tenant, "all"],
    queryFn: () => fetch(`/api/${tenant}/inventory`).then((r) => r.json()),
  });

  const { data: invoices = [], isLoading: invoiceLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", tenant],
    queryFn: () => fetch(`/api/${tenant}/invoices`).then((r) => r.json()),
  });

  // ─── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const expired = batches.filter((b) => b.status === "expired");
    const nearExpiry = batches.filter((b) => b.status === "near_expiry");
    const expiredValue = expired.reduce((s, b) => s + b.availableQty * b.mrp, 0);
    const nearExpValue = nearExpiry.reduce((s, b) => s + b.availableQty * b.mrp, 0);
    const activeStockValue = batches
      .filter((b) => b.status !== "expired")
      .reduce((s, b) => s + b.availableQty * b.purchasePrice, 0);
    const totalRevenue = invoices.reduce((s, inv) => s + inv.grandTotal, 0);
    return { expired, nearExpiry, expiredValue, nearExpValue, activeStockValue, totalRevenue };
  }, [batches, invoices]);

  // ─── Chart data ───────────────────────────────────────────────────────────
  const valuationData = useMemo(() => {
    const map: Record<string, number> = {};
    batches.forEach((b) => {
      if (b.status !== "expired") {
        map[b.itemName] = (map[b.itemName] ?? 0) + b.availableQty * b.purchasePrice;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: shortName(name), value }))
      .sort((a, b) => b.value - a.value);
  }, [batches]);

  const movementData = useMemo(() => {
    const map: Record<string, { consumed: number; remaining: number }> = {};
    batches.forEach((b) => {
      if (!map[b.itemName]) map[b.itemName] = { consumed: 0, remaining: 0 };
      map[b.itemName].consumed += b.originalQty - b.availableQty;
      map[b.itemName].remaining += b.availableQty;
    });
    return Object.entries(map).map(([name, v]) => ({
      name: shortName(name),
      consumed: v.consumed,
      remaining: v.remaining,
    }));
  }, [batches]);

  const expiryTableBatches = useMemo(() => {
    const order: Record<string, number> = { expired: 0, near_expiry: 1, active: 2 };
    return [...batches].sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return a.expiryDate.localeCompare(b.expiryDate);
    });
  }, [batches]);

  const isLoading = batchLoading || invoiceLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Expired Batches",
      value: String(stats.expired.length),
      sub: stats.expiredValue > 0 ? `${rupees(stats.expiredValue)} at risk` : "No stock remaining",
      icon: XCircle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      valueCls: "text-red-600",
    },
    {
      label: "Near-Expiry Batches",
      value: String(stats.nearExpiry.length),
      sub: `${rupees(stats.nearExpValue)} at risk`,
      icon: AlertCircle,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valueCls: "text-amber-600",
    },
    {
      label: "Active Stock Value",
      value: rupees(stats.activeStockValue),
      sub: `${batches.filter((b) => b.status === "active").length} active batches`,
      icon: TrendingUp,
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
      valueCls: "text-teal-700",
    },
    {
      label: "Total Revenue",
      value: rupees(stats.totalRevenue),
      sub: `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`,
      icon: IndianRupee,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      valueCls: "text-violet-700",
    },
  ];

  const tooltipStyle = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-xl border border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate">
                    {card.label}
                  </p>
                  <p className={`text-2xl font-bold leading-none mb-1.5 ${card.valueCls}`}>
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
                </div>
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${card.iconBg}`}
                >
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs + content ───────────────────────────────────────────────── */}
      <Card className="rounded-xl border border-border shadow-none overflow-hidden">
        <CardHeader className="pb-0 px-5 pt-5">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {/* ── Expiry Report ─────────────────────────────────────────── */}
          {activeTab === "expiry" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                All batches sorted by urgency — expired first, then expiring soon.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Item", "Batch No", "Supplier", "Expiry", "Status", "Qty", "Value"].map((h, i) => (
                        <th
                          key={h}
                          className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${
                            i >= 5 ? "text-right pr-0" : "text-left pr-4"
                          } ${i === 6 ? "" : "pr-4"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expiryTableBatches.map((batch) => (
                      <tr
                        key={batch.id}
                        className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${
                          batch.status === "expired"
                            ? "bg-red-50/50 dark:bg-red-950/10"
                            : batch.status === "near_expiry"
                            ? "bg-amber-50/30 dark:bg-amber-950/10"
                            : ""
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                              <Package2 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{batch.itemName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                          {batch.batchNumber}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {batch.supplierName}
                        </td>
                        <td className="py-3 pr-4">
                          <ExpiryBadge expiryDate={batch.expiryDate} />
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={batch.status} />
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">
                          {batch.availableQty === 0 ? (
                            <span className="text-muted-foreground italic text-xs">Nil</span>
                          ) : (
                            batch.availableQty
                          )}
                        </td>
                        <td className="py-3 text-right font-medium text-foreground">
                          {batch.availableQty > 0
                            ? rupees(batch.availableQty * batch.mrp)
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Stock Valuation ───────────────────────────────────────── */}
          {activeTab === "valuation" && (
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                Purchase cost of available stock per medicine (non-expired batches).
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={valuationData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${((v as number) / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v) => [rupees(v as number), "Stock Value"]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" fill="oklch(0.52 0.15 196)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Stock Movement ────────────────────────────────────────── */}
          {activeTab === "movement" && (
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                Total consumed vs remaining quantity per medicine across all batches.
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={movementData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v, name) => [v, name === "consumed" ? "Consumed" : "Remaining"]}
                    contentStyle={tooltipStyle}
                  />
                  <Legend
                    formatter={(value) => (value === "consumed" ? "Consumed" : "Remaining")}
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Bar
                    dataKey="consumed"
                    fill="oklch(0.65 0.15 30)"
                    radius={[0, 0, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="remaining"
                    fill="oklch(0.52 0.15 196)"
                    radius={[4, 4, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Invoices ──────────────────────────────────────────────── */}
          {activeTab === "invoices" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} recorded.
              </p>
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No invoices yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create invoices from the Billing page.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Invoice", "Customer", "Date", "Items", "Subtotal", "Discount", "Grand Total"].map(
                          (h, i) => (
                            <th
                              key={h}
                              className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${
                                i >= 4 ? "text-right" : "text-left pr-4"
                              } ${i < 6 ? "pr-4" : ""}`}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground uppercase">
                            {inv.id}
                          </td>
                          <td className="py-3 pr-4 font-medium">{inv.customerName}</td>
                          <td className="py-3 pr-4 text-muted-foreground text-xs">
                            {format(parseISO(inv.createdAt), "dd MMM yyyy")}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {inv.lineItems.length} item{inv.lineItems.length !== 1 ? "s" : ""}
                          </td>
                          <td className="py-3 pr-4 text-right">{rupees(inv.subtotal)}</td>
                          <td className="py-3 pr-4 text-right text-red-600">
                            {inv.customerDiscountAmount > 0
                              ? `−${rupees(inv.customerDiscountAmount)}`
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 text-right font-bold text-teal-700">
                            {rupees(inv.grandTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td
                          colSpan={6}
                          className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          Total Revenue
                        </td>
                        <td className="py-3 text-right font-bold text-lg text-teal-700">
                          {rupees(stats.totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
