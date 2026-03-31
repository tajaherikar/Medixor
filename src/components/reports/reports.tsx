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
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Batch, Doctor, Invoice, SupplierBill } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge, StatusBadge } from "@/components/ui/expiry-badge";

interface ReportsProps {
  tenant: string;
}

type Tab = "expiry" | "valuation" | "movement" | "invoices" | "sales" | "purchase" | "gst" | "doctor";

const tabs: { key: Tab; label: string }[] = [
  { key: "expiry",    label: "Expiry Report" },
  { key: "valuation", label: "Stock Valuation" },
  { key: "movement",  label: "Stock Movement" },
  { key: "invoices",  label: "Invoices" },
  { key: "sales",     label: "Sales Register" },
  { key: "purchase",  label: "Purchase Register" },
  { key: "gst",       label: "GST Summary" },
  { key: "doctor",    label: "Doctor Reference" },
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

  const { data: supplierBills = [], isLoading: billsLoading } = useQuery<SupplierBill[]>({
    queryKey: ["supplier-bills", tenant],
    queryFn: () => fetch(`/api/${tenant}/supplier-bills`).then((r) => r.json()),
  });
  const { data: doctors = [], isLoading: doctorLoading } = useQuery<Doctor[]>({
    queryKey: ["doctors", tenant],
    queryFn: () => fetch(`/api/${tenant}/doctors`).then((r) => r.json()),
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

  const isLoading = batchLoading || invoiceLoading || billsLoading || doctorLoading;

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

          {/* ── Sales Register ────────────────────────────────────────── */}
          {activeTab === "sales" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Detailed sales register with GST breakdown — {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Invoice", "Customer", "Date", "HSN", "Taxable Amt", "CGST", "SGST", "Total GST", "Grand Total", "Status"].map((h, i) => (
                        <th key={h} className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${i >= 4 ? "text-right pr-0" : "text-left pr-4"} ${i < 9 ? "pr-4" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const hsnSet = [...new Set(inv.lineItems.map((l) => l.hsnCode))].join(", ");
                      const totalCgst = inv.lineItems.reduce((s, l) => s + (l.cgst ?? 0), 0);
                      const totalSgst = inv.lineItems.reduce((s, l) => s + (l.sgst ?? 0), 0);
                      const payMap: Record<string, string> = { paid: "bg-green-100 text-green-700 border-green-200", partial: "bg-amber-100 text-amber-700 border-amber-200", unpaid: "bg-red-100 text-red-700 border-red-200" };
                      return (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="py-3 pr-4 font-mono text-xs text-muted-foreground uppercase">{inv.id}</td>
                          <td className="py-3 pr-4 font-medium">{inv.customerName}</td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">{format(parseISO(inv.createdAt), "dd MMM yyyy")}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{hsnSet}</td>
                          <td className="py-3 pr-4 text-right">{rupees(inv.taxableAmount ?? inv.subtotal)}</td>
                          <td className="py-3 pr-4 text-right text-blue-600">{rupees(totalCgst)}</td>
                          <td className="py-3 pr-4 text-right text-blue-600">{rupees(totalSgst)}</td>
                          <td className="py-3 pr-4 text-right text-blue-700 font-medium">{rupees(inv.totalGst ?? 0)}</td>
                          <td className="py-3 pr-4 text-right font-bold text-teal-700">{rupees(inv.grandTotal)}</td>
                          <td className="py-3">
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium border ${payMap[inv.paymentStatus] ?? payMap.unpaid}`}>
                              {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={4} className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals</td>
                      <td className="py-3 pr-4 text-right font-semibold">{rupees(invoices.reduce((s, i) => s + (i.taxableAmount ?? i.subtotal), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(invoices.reduce((s, i) => s + i.lineItems.reduce((x, l) => x + (l.cgst ?? 0), 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(invoices.reduce((s, i) => s + i.lineItems.reduce((x, l) => x + (l.sgst ?? 0), 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-700">{rupees(invoices.reduce((s, i) => s + (i.totalGst ?? 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-bold text-lg text-teal-700">{rupees(stats.totalRevenue)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Purchase Register ─────────────────────────────────────── */}
          {activeTab === "purchase" && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Supplier purchase bills with GST breakdown — {supplierBills.length} bill{supplierBills.length !== 1 ? "s" : ""}.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Supplier", "Invoice #", "Date", "Taxable Amt", "CGST (Input)", "SGST (Input)", "Total GST", "Grand Total", "Status"].map((h, i) => (
                        <th key={h} className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${i >= 3 ? "text-right pr-0" : "text-left pr-4"} ${i < 8 ? "pr-4" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {supplierBills.map((bill) => {
                      const totalCgst = bill.items.reduce((s, i) => s + i.cgst, 0);
                      const totalSgst = bill.items.reduce((s, i) => s + i.sgst, 0);
                      const payMap: Record<string, string> = { paid: "bg-green-100 text-green-700 border-green-200", partial: "bg-amber-100 text-amber-700 border-amber-200", unpaid: "bg-red-100 text-red-700 border-red-200" };
                      return (
                        <tr key={bill.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                          <td className="py-3 pr-4 font-medium">{bill.supplierName}</td>
                          <td className="py-3 pr-4 font-mono text-xs">{bill.invoiceNumber}</td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">{format(parseISO(bill.date), "dd MMM yyyy")}</td>
                          <td className="py-3 pr-4 text-right">{rupees(bill.taxableAmount)}</td>
                          <td className="py-3 pr-4 text-right text-blue-600">{rupees(totalCgst)}</td>
                          <td className="py-3 pr-4 text-right text-blue-600">{rupees(totalSgst)}</td>
                          <td className="py-3 pr-4 text-right text-blue-700 font-medium">{rupees(bill.totalGst)}</td>
                          <td className="py-3 pr-4 text-right font-bold">{rupees(bill.grandTotal)}</td>
                          <td className="py-3">
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium border ${payMap[bill.paymentStatus] ?? payMap.unpaid}`}>
                              {bill.paymentStatus.charAt(0).toUpperCase() + bill.paymentStatus.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={3} className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals</td>
                      <td className="py-3 pr-4 text-right font-semibold">{rupees(supplierBills.reduce((s, b) => s + b.taxableAmount, 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(supplierBills.reduce((s, b) => s + b.items.reduce((x, i) => x + i.cgst, 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(supplierBills.reduce((s, b) => s + b.items.reduce((x, i) => x + i.sgst, 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-700">{rupees(supplierBills.reduce((s, b) => s + b.totalGst, 0))}</td>
                      <td className="py-3 pr-4 text-right font-bold text-lg">{rupees(supplierBills.reduce((s, b) => s + b.grandTotal, 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── GST Summary ───────────────────────────────────────────── */}
          {activeTab === "gst" && (() => {
            // Aggregate output GST (from sales invoices)
            const outputGst: Record<string, { taxable: number; cgst: number; sgst: number; total: number }> = {};
            for (const inv of invoices) {
              for (const l of inv.lineItems) {
                const key = `${l.hsnCode ?? "—"}|${l.gstRate ?? 0}%`;
                if (!outputGst[key]) outputGst[key] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
                outputGst[key].taxable += l.taxableAmount ?? l.lineTotal;
                outputGst[key].cgst += l.cgst ?? 0;
                outputGst[key].sgst += l.sgst ?? 0;
                outputGst[key].total += l.gstAmount ?? (l.cgst ?? 0) + (l.sgst ?? 0);
              }
            }
            // Aggregate input GST (from purchase bills)
            const inputGst: Record<string, { taxable: number; cgst: number; sgst: number; total: number }> = {};
            for (const bill of supplierBills) {
              for (const item of bill.items) {
                const key = `${item.hsnCode}|${item.gstRate}%`;
                if (!inputGst[key]) inputGst[key] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
                inputGst[key].taxable += item.taxableAmount;
                inputGst[key].cgst += item.cgst;
                inputGst[key].sgst += item.sgst;
                inputGst[key].total += item.cgst + item.sgst;
              }
            }
            const totalOutputGst = Object.values(outputGst).reduce((s, v) => s + v.total, 0);
            const totalInputGst  = Object.values(inputGst).reduce((s, v) => s + v.total, 0);
            const netGstPayable  = totalOutputGst - totalInputGst;
            return (
              <div className="space-y-6">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Output GST (Sales)", value: rupees(totalOutputGst), color: "text-teal-700" },
                    { label: "Input GST (Purchases)", value: rupees(totalInputGst), color: "text-blue-700" },
                    { label: "Net GST Payable", value: rupees(netGstPayable), color: netGstPayable > 0 ? "text-red-600" : "text-green-600" },
                  ].map(({ label, value, color }) => (
                    <Card key={label} className="border border-border shadow-none">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`text-xl font-bold ${color}`} style={{ fontFamily: "var(--font-jakarta)" }}>{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Output GST breakdown */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-teal-700">Output GST — Sales</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["HSN Code", "GST Rate", "Taxable Amount", "CGST", "SGST", "Total GST"].map((h, i) => (
                          <th key={h} className={`text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide ${i >= 2 ? "text-right pr-0" : "text-left pr-4"} ${i < 5 ? "pr-4" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(outputGst).map(([key, v]) => {
                        const [hsn, rate] = key.split("|");
                        return (
                          <tr key={key} className="border-b border-border/50 hover:bg-muted/40">
                            <td className="py-2.5 pr-4 font-mono text-xs">{hsn}</td>
                            <td className="py-2.5 pr-4 font-medium">{rate}</td>
                            <td className="py-2.5 pr-4 text-right">{rupees(v.taxable)}</td>
                            <td className="py-2.5 pr-4 text-right text-teal-600">{rupees(v.cgst)}</td>
                            <td className="py-2.5 pr-4 text-right text-teal-600">{rupees(v.sgst)}</td>
                            <td className="py-2.5 text-right font-semibold text-teal-700">{rupees(v.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Input GST breakdown */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 text-blue-700">Input GST — Purchases (ITC Eligible)</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["HSN Code", "GST Rate", "Taxable Amount", "CGST (ITC)", "SGST (ITC)", "Total ITC"].map((h, i) => (
                          <th key={h} className={`text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide ${i >= 2 ? "text-right pr-0" : "text-left pr-4"} ${i < 5 ? "pr-4" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(inputGst).map(([key, v]) => {
                        const [hsn, rate] = key.split("|");
                        return (
                          <tr key={key} className="border-b border-border/50 hover:bg-muted/40">
                            <td className="py-2.5 pr-4 font-mono text-xs">{hsn}</td>
                            <td className="py-2.5 pr-4 font-medium">{rate}</td>
                            <td className="py-2.5 pr-4 text-right">{rupees(v.taxable)}</td>
                            <td className="py-2.5 pr-4 text-right text-blue-600">{rupees(v.cgst)}</td>
                            <td className="py-2.5 pr-4 text-right text-blue-600">{rupees(v.sgst)}</td>
                            <td className="py-2.5 text-right font-semibold text-blue-700">{rupees(v.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── Doctor Reference ──────────────────────────────────── */}
          {activeTab === "doctor" && (() => {
            // Group invoices by doctor ID (new) or free-text name (legacy fallback)
            const byId: Record<string, Invoice[]> = {};
            const byName: Record<string, Invoice[]> = {};
            const walkIn: Invoice[] = [];
            for (const inv of invoices) {
              if (inv.referredById) {
                if (!byId[inv.referredById]) byId[inv.referredById] = [];
                byId[inv.referredById].push(inv);
              } else if (inv.referredBy?.trim()) {
                const k = inv.referredBy.trim();
                if (!byName[k]) byName[k] = [];
                byName[k].push(inv);
              } else {
                walkIn.push(inv);
              }
            }
            // Doctor rows from doctors table (includes targets)
            const doctorRows = doctors.map((d) => {
              const invList = byId[d.id] ?? [];
              const actual = invList.reduce((s, i) => s + i.grandTotal, 0);
              const pct = d.targetAmount > 0 ? (actual / d.targetAmount) * 100 : null as number | null;
              return { id: d.id as string | null, name: d.name, type: d.type as string, phone: d.phone, target: d.targetAmount, actual, count: invList.length, pct };
            }).sort((a, b) => b.actual - a.actual);
            // Legacy free-text rows (no doctor ID)
            const legacyRows = Object.entries(byName).map(([name, invList]) => ({
              id: null as string | null, name, type: "legacy", phone: undefined as string | undefined,
              target: 0, actual: invList.reduce((s, i) => s + i.grandTotal, 0), count: invList.length, pct: null as number | null,
            })).sort((a, b) => b.actual - a.actual);
            const allRows = [
              ...doctorRows,
              ...legacyRows,
              ...(walkIn.length > 0 ? [{ id: null as string | null, name: "Direct / Walk-in", type: "walkin", phone: undefined as string | undefined, target: 0, actual: walkIn.reduce((s, i) => s + i.grandTotal, 0), count: walkIn.length, pct: null as number | null }] : []),
            ];
            const totalTarget = doctorRows.reduce((s, r) => s + r.target, 0);
            const totalReferredActual = doctorRows.reduce((s, r) => s + r.actual, 0) + legacyRows.reduce((s, r) => s + r.actual, 0);
            const chartData = doctorRows.filter((d) => d.target > 0).map((d) => ({ name: d.name.split(" ").slice(0, 2).join(" "), target: d.target, actual: d.actual }));
            const typeBadge: Record<string, string> = {
              doctor: "bg-blue-100 text-blue-700",
              lab: "bg-purple-100 text-purple-700",
              consultant: "bg-teal-100 text-teal-700",
              legacy: "bg-gray-100 text-gray-600",
              walkin: "bg-gray-100 text-gray-400",
            };
            // legacy: totalReferredRevenue kept for compat
            const totalReferredRevenue = totalReferredActual;
            const rows = allRows; // compat alias — suppress unused warning
            void rows; void totalReferredRevenue;
            return (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Registered Doctors", value: String(doctors.length), cls: "text-violet-700", icon: Users, iconBg: "bg-violet-100", iconCls: "text-violet-600" },
                    { label: "Referred Revenue", value: rupees(totalReferredActual), cls: "text-teal-700", icon: IndianRupee, iconBg: "bg-teal-100", iconCls: "text-teal-600" },
                    { label: "Total Monthly Target", value: totalTarget > 0 ? rupees(totalTarget) : "—", cls: "text-amber-700", icon: TrendingUp, iconBg: "bg-amber-100", iconCls: "text-amber-600" },
                    {
                      label: "Overall Achievement",
                      value: totalTarget > 0 ? `${Math.round((totalReferredActual / totalTarget) * 100)}%` : "—",
                      cls: totalTarget > 0 ? (totalReferredActual >= totalTarget ? "text-green-700" : totalReferredActual >= totalTarget * 0.7 ? "text-amber-600" : "text-red-600") : "text-muted-foreground",
                      icon: FileText, iconBg: "bg-green-100", iconCls: "text-green-600",
                    },
                  ].map(({ label, value, cls, icon: Icon, iconBg, iconCls }) => (
                    <Card key={label} className="border border-border shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className={`text-xl font-bold ${cls}`}>{value}</p>
                          </div>
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${iconBg}`}>
                            <Icon className={`h-4 w-4 ${iconCls}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Target vs Actual bar chart */}
                {chartData.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3">Target vs Actual Revenue</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => `₹${((v as number) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip formatter={(v, name) => [rupees(v as number), name === "target" ? "Target" : "Actual"]} contentStyle={tooltipStyle} />
                        <Legend formatter={(v) => v === "target" ? "Target" : "Actual"} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                        <Bar dataKey="target" fill="oklch(0.75 0.12 60)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" fill="oklch(0.52 0.15 196)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Reference breakdown table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Reference Person", "Type", "Phone", "Monthly Target", "Actual Revenue", "Achievement", "Bills"].map((h, i) => (
                          <th key={h} className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${i >= 3 ? "text-right pr-0" : "text-left pr-4"} ${i < 6 ? "pr-4" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row, idx) => {
                        const pct = row.pct;
                        const pctColor = pct === null ? "" : pct >= 100 ? "text-green-700" : pct >= 70 ? "text-amber-600" : "text-red-600";
                        const barColor = pct === null ? "bg-muted" : pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
                        return (
                          <tr key={row.id ?? row.name + idx} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                            <td className="py-3 pr-4 font-medium">{row.name}</td>
                            <td className="py-3 pr-4">
                              <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[row.type] ?? typeBadge.legacy}`}>
                                {row.type === "walkin" ? "Walk-in" : row.type === "legacy" ? "Unregistered" : row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">{row.phone ?? "—"}</td>
                            <td className="py-3 pr-4 text-right">
                              {row.target > 0 ? rupees(row.target) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="py-3 pr-4 text-right font-semibold text-teal-700">{rupees(row.actual)}</td>
                            <td className="py-3 pr-4 text-right">
                              {pct !== null ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`text-xs font-semibold ${pctColor}`}>{Math.round(pct)}%</span>
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                            <td className="py-3 text-right">{row.count}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td colSpan={3} className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals</td>
                        <td className="py-3 pr-4 text-right font-semibold">{totalTarget > 0 ? rupees(totalTarget) : "—"}</td>
                        <td className="py-3 pr-4 text-right font-bold text-lg text-teal-700">{rupees(allRows.reduce((s, r) => s + r.actual, 0))}</td>
                        <td></td>
                        <td className="py-3 text-right font-semibold">{allRows.reduce((s, r) => s + r.count, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
