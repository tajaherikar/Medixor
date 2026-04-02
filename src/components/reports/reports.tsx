"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, Fragment } from "react";
import { InvoicePrintModal } from "./invoice-print-modal";
import { BillPrintModal } from "./bill-print-modal";
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
  Printer,
  Eye,
  Search,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Batch, Doctor, Invoice, SupplierBill } from "@/lib/types";
import { useSettingsStore } from "@/lib/stores";
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

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell).replace(/"/g, '""');
          return /[,"\n]/.test(s) ? `"${s}"` : s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function shortName(name: string) {
  return name.replace(/ \d+(mg|ml)$/i, "");
}

export function Reports({ tenant }: ReportsProps) {
  const accentHue = useSettingsStore((s) => s.settings.accentHue);

  const [activeTab, setActiveTab] = useState<Tab>("expiry");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  // Date range — default to current month
  const [dateFrom, setDateFrom] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // Tabs that respect the date filter
  const DATE_TABS: Tab[] = ["invoices", "sales", "purchase", "gst", "doctor"];
  // Tabs that support CSV export
  const CSV_TABS: Tab[] = ["expiry", "invoices", "sales", "purchase"];

  // Search state
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [expirySearch, setExpirySearch] = useState("");

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
  // ─── Date-filtered data ───────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    const byDate = invoices.filter((inv) => {
      const d = inv.createdAt.slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    });
    if (!invoiceSearch.trim()) return byDate;
    const q = invoiceSearch.toLowerCase();
    return byDate.filter(
      (inv) =>
        inv.customerName.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q)
    );
  }, [invoices, dateFrom, dateTo, invoiceSearch]);

  const filteredBills = useMemo(() => {
    return supplierBills.filter((b) => {
      const d = b.date.slice(0, 10);
      return d >= dateFrom && d <= dateTo;
    });
  }, [supplierBills, dateFrom, dateTo]);

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

  const searchedExpiry = useMemo(() => {
    if (!expirySearch.trim()) return expiryTableBatches;
    const q = expirySearch.toLowerCase();
    return expiryTableBatches.filter(
      (b) =>
        b.itemName.toLowerCase().includes(q) ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q)
    );
  }, [expiryTableBatches, expirySearch]);

  // Unique suppliers for filter
  const uniqueSuppliers = useMemo(() => {
    const suppliers = [...new Set(expiryTableBatches.map((b) => b.supplierName))].sort();
    return suppliers;
  }, [expiryTableBatches]);

  // Grouped expiry by supplier
  const groupedExpiry = useMemo(() => {
    const filtered = selectedSupplier === "all" ? searchedExpiry : searchedExpiry.filter((b) => b.supplierName === selectedSupplier);
    const groups: Record<string, typeof searchedExpiry> = {};
    filtered.forEach((b) => {
      if (!groups[b.supplierName]) groups[b.supplierName] = [];
      groups[b.supplierName].push(b);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [searchedExpiry, selectedSupplier]);

  const isLoading = batchLoading || invoiceLoading || billsLoading || doctorLoading;

  function handleExportCsv() {
    const dateLabel = `${dateFrom}_to_${dateTo}`;
    if (activeTab === "expiry") {
      const rows: (string | number)[][] = [
        ["Item", "Batch No", "Supplier", "Expiry Date", "Status", "Qty", "Value (MRP)"],
      ];
      groupedExpiry.forEach(([supplier, batches]) => {
        const expired = batches.filter((b) => b.status === "expired").length;
        const nearExpiry = batches.filter((b) => b.status === "near_expiry").length;
        const totalValue = batches.reduce((s, b) => s + b.availableQty * b.mrp, 0);
        rows.push([`Supplier: ${supplier}`, `${batches.length} batches (${expired} expired, ${nearExpiry} near expiry)`, `Total Value: ₹${totalValue}`, "", "", "", ""]);
        batches.forEach((b) => {
          rows.push([
            b.itemName, b.batchNumber, b.supplierName, b.expiryDate,
            b.status, b.availableQty, b.availableQty * b.mrp,
          ]);
        });
      });
      downloadCsv(rows, `expiry-report.csv`);
    } else if (activeTab === "invoices") {
      const rows: (string | number)[][] = [
        ["Invoice ID", "Customer", "Date", "Items", "Subtotal", "Discount", "Grand Total"],
        ...filteredInvoices.map((inv) => [
          inv.id, inv.customerName,
          format(parseISO(inv.createdAt), "dd MMM yyyy"),
          inv.lineItems.length,
          inv.subtotal, inv.customerDiscountAmount, inv.grandTotal,
        ]),
      ];
      downloadCsv(rows, `invoices-${dateLabel}.csv`);
    } else if (activeTab === "sales") {
      const rows: (string | number)[][] = [
        ["Invoice ID", "Customer", "Date", "HSN", "Taxable Amount", "CGST", "SGST", "Total GST", "Grand Total", "Status"],
        ...filteredInvoices.map((inv) => {
          const hsnSet = [...new Set(inv.lineItems.map((l) => l.hsnCode))].join("; ");
          const totalCgst = inv.lineItems.reduce((s, l) => s + (l.cgst ?? 0), 0);
          const totalSgst = inv.lineItems.reduce((s, l) => s + (l.sgst ?? 0), 0);
          return [
            inv.id, inv.customerName,
            format(parseISO(inv.createdAt), "dd MMM yyyy"),
            hsnSet,
            inv.taxableAmount ?? inv.subtotal,
            totalCgst, totalSgst, inv.totalGst ?? 0, inv.grandTotal,
            inv.paymentStatus,
          ];
        }),
      ];
      downloadCsv(rows, `sales-register-${dateLabel}.csv`);
    } else if (activeTab === "purchase") {
      const rows: (string | number)[][] = [
        ["Supplier", "Invoice #", "Date", "Taxable Amount", "CGST (Input)", "SGST (Input)", "Total GST", "Grand Total", "Status"],
        ...filteredBills.map((bill) => {
          const totalCgst = bill.items.reduce((s, i) => s + i.cgst, 0);
          const totalSgst = bill.items.reduce((s, i) => s + i.sgst, 0);
          return [
            bill.supplierName, bill.invoiceNumber,
            format(parseISO(bill.date), "dd MMM yyyy"),
            bill.taxableAmount, totalCgst, totalSgst, bill.totalGst, bill.grandTotal,
            bill.paymentStatus,
          ];
        }),
      ];
      downloadCsv(rows, `purchase-register-${dateLabel}.csv`);
    }
  }

  const tooltipStyle = useMemo(() => ({
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
  }), []);

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

  return (
    <div className="space-y-6">
      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          {/* Toolbar row: active report label + print button */}
          <div className="print:hidden flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">
              {tabs.find((t) => t.key === activeTab)?.label}
            </p>
            <div className="flex items-center gap-2">
              {CSV_TABS.includes(activeTab) && (
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Export as CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Print or save as PDF"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
          {/* Tab pills */}
          <div className="print:hidden flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
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
          {/* Date range filter — only shown for date-sensitive tabs */}
          {DATE_TABS.includes(activeTab) && (
            <div className="print:hidden flex flex-wrap items-center gap-3 mt-3 mb-1 p-3 rounded-lg bg-muted/40 border border-border/50">
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <label className="text-xs text-muted-foreground font-medium">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => {
                  setDateFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                  setDateTo(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-1"
              >
                This month
              </button>
              <span className="text-xs text-muted-foreground ml-auto">
                {activeTab === "purchase"
                  ? `${filteredBills.length} bill${filteredBills.length !== 1 ? "s" : ""}`
                  : `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? "s" : ""}`}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {/* Print-only header ─────────────────────────────────────── */}
          <div className="hidden print:block mb-6 pb-4 border-b border-gray-200">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Medixor — Reports</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>

          {/* ── Expiry Report ─────────────────────────────────────────── */}
          {activeTab === "expiry" && (
            <div>
              <div className="print:hidden flex items-center gap-3 mb-4 flex-wrap">
                {/* Supplier Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Supplier:</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => {
                      setSelectedSupplier(e.target.value);
                      setExpandedSuppliers(e.target.value === "all" ? new Set(uniqueSuppliers) : new Set([e.target.value]));
                    }}
                    className="px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All Suppliers</option>
                    {uniqueSuppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search item, batch…"
                    value={expirySearch}
                    onChange={(e) => setExpirySearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Results count */}
                {(expirySearch || selectedSupplier !== "all") && (
                  <span className="text-xs text-muted-foreground">
                    {groupedExpiry.reduce((s, [, batches]) => s + batches.length, 0)} batch{groupedExpiry.reduce((s, [, batches]) => s + batches.length, 0) !== 1 ? "es" : ""}
                  </span>
                )}
              </div>

              {/* Grouped by Supplier */}
              <div className="space-y-3">
                {groupedExpiry.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No batches found
                  </div>
                ) : (
                  groupedExpiry.map(([supplier, batches]) => {
                    const isExpanded = expandedSuppliers.has(supplier);
                    const totalBatches = batches.length;
                    const expired = batches.filter((b) => b.status === "expired");
                    const nearExpiry = batches.filter((b) => b.status === "near_expiry");
                    const totalValue = batches.reduce((s, b) => s + b.availableQty * b.mrp, 0);

                    return (
                      <div key={supplier} className="border border-border rounded-lg overflow-hidden">
                        {/* Supplier Header */}
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedSuppliers);
                            if (isExpanded) {
                              newSet.delete(supplier);
                            } else {
                              newSet.add(supplier);
                            }
                            setExpandedSuppliers(newSet);
                          }}
                          className="w-full bg-muted/50 hover:bg-muted/70 transition-colors px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="font-semibold text-foreground">{supplier}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {totalBatches} batch{totalBatches !== 1 ? "es" : ""} 
                                {expired.length > 0 && <span className="ml-2 text-red-600 font-medium">• {expired.length} Expired</span>}
                                {nearExpiry.length > 0 && <span className="ml-2 text-amber-600 font-medium">• {nearExpiry.length} Near Expiry</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-foreground">{rupees(totalValue)}</div>
                          </div>
                        </button>

                        {/* Batches Table (visible when expanded) */}
                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-t border-border bg-background/50">
                                  {["Item", "Batch No", "Expiry", "Status", "Qty", "Value"].map((h, i) => (
                                    <th
                                      key={h}
                                      className={`text-xs font-semibold text-muted-foreground py-2.5 px-4 uppercase tracking-wide ${
                                        i >= 4 ? "text-right" : "text-left"
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {batches.map((batch) => (
                                  <tr
                                    key={batch.id}
                                    className={`border-t border-border/50 transition-colors hover:bg-muted/30 ${
                                      batch.status === "expired"
                                        ? "bg-red-50/30 dark:bg-red-950/10"
                                        : batch.status === "near_expiry"
                                        ? "bg-amber-50/20 dark:bg-amber-950/10"
                                        : ""
                                    }`}
                                  >
                                    <td className="py-2.5 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 shrink-0">
                                          <Package2 className="h-3 w-3 text-primary" />
                                        </div>
                                        <span className="font-medium text-foreground text-xs">{batch.itemName}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                                      {batch.batchNumber}
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <ExpiryBadge expiryDate={batch.expiryDate} />
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <StatusBadge status={batch.status} />
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-medium text-sm">
                                      {batch.availableQty === 0 ? (
                                        <span className="text-muted-foreground italic text-xs">Nil</span>
                                      ) : (
                                        batch.availableQty
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-medium text-foreground text-sm">
                                      {batch.availableQty > 0
                                        ? rupees(batch.availableQty * batch.mrp)
                                        : <span className="text-muted-foreground">—</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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
                  <Bar dataKey="value" fill={`oklch(0.52 0.15 ${accentHue})`} radius={[5, 5, 0, 0]} />
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
                    fill={`oklch(0.52 0.15 ${accentHue})`}
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
                {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} in selected range.
              </p>
              <div className="print:hidden flex items-center gap-2 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search customer or invoice ID…"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {invoiceSearch && (
                  <span className="text-xs text-muted-foreground">{filteredInvoices.length} result{filteredInvoices.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {filteredInvoices.length === 0 ? (
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
                        <th className="w-6" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="group border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedInvoice(inv)}
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
                          <td className="py-3 pl-2">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
                          {rupees(filteredInvoices.reduce((s, i) => s + i.grandTotal, 0))}
                        </td>
                        <td></td>
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
                Detailed sales register with GST breakdown — {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""} in selected range.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Invoice", "Customer", "Date", "HSN", "Taxable Amt", "CGST", "SGST", "Total GST", "Grand Total", "Status"].map((h, i) => (
                        <th key={h} className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${i >= 4 ? "text-right pr-0" : "text-left pr-4"} ${i < 9 ? "pr-4" : ""}`}>{h}</th>
                      ))}
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const hsnSet = [...new Set(inv.lineItems.map((l) => l.hsnCode))].join(", ");
                      const totalCgst = inv.lineItems.reduce((s, l) => s + (l.cgst ?? 0), 0);
                      const totalSgst = inv.lineItems.reduce((s, l) => s + (l.sgst ?? 0), 0);
                      const payMap: Record<string, string> = { paid: "bg-green-100 text-green-700 border-green-200", partial: "bg-amber-100 text-amber-700 border-amber-200", unpaid: "bg-red-100 text-red-700 border-red-200" };
                      return (
                        <tr key={inv.id} className="group border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
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
                          <td className="py-3 pl-2">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={4} className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals</td>
                      <td className="py-3 pr-4 text-right font-semibold">{rupees(filteredInvoices.reduce((s, i) => s + (i.taxableAmount ?? i.subtotal), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(filteredInvoices.reduce((s, i) => s + i.lineItems.reduce((x, l) => x + (l.cgst ?? 0), 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(filteredInvoices.reduce((s, i) => s + i.lineItems.reduce((x, l) => x + (l.sgst ?? 0), 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-700">{rupees(filteredInvoices.reduce((s, i) => s + (i.totalGst ?? 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-bold text-lg text-teal-700">{rupees(filteredInvoices.reduce((s, i) => s + i.grandTotal, 0))}</td>
                      <td></td>
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
                Supplier purchase bills with GST breakdown — {filteredBills.length} bill{filteredBills.length !== 1 ? "s" : ""} in selected range.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Supplier", "Invoice #", "Date", "Taxable Amt", "CGST (Input)", "SGST (Input)", "Total GST", "Grand Total", "Status"].map((h, i) => (
                        <th key={h} className={`text-xs font-semibold text-muted-foreground py-2.5 uppercase tracking-wide ${i >= 3 ? "text-right pr-0" : "text-left pr-4"} ${i < 8 ? "pr-4" : ""}`}>{h}</th>
                      ))}
                      <th className="w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill) => {
                      const totalCgst = bill.items.reduce((s, i) => s + i.cgst, 0);
                      const totalSgst = bill.items.reduce((s, i) => s + i.sgst, 0);
                      const payMap: Record<string, string> = { paid: "bg-green-100 text-green-700 border-green-200", partial: "bg-amber-100 text-amber-700 border-amber-200", unpaid: "bg-red-100 text-red-700 border-red-200" };
                      return (
                        <tr key={bill.id} className="group border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => setSelectedBill(bill)}>
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
                          <td className="py-3 pl-2">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td colSpan={3} className="py-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals</td>
                      <td className="py-3 pr-4 text-right font-semibold">{rupees(filteredBills.reduce((s, b) => s + b.taxableAmount, 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(filteredBills.reduce((s, b) => s + b.items.reduce((x, i) => x + i.cgst, 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-600">{rupees(filteredBills.reduce((s, b) => s + b.items.reduce((x, i) => x + i.sgst, 0), 0))}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-blue-700">{rupees(filteredBills.reduce((s, b) => s + b.totalGst, 0))}</td>
                      <td className="py-3 pr-4 text-right font-bold text-lg">{rupees(filteredBills.reduce((s, b) => s + b.grandTotal, 0))}</td>
                      <td></td>
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
            for (const inv of filteredInvoices) {
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
            for (const bill of filteredBills) {
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
            for (const inv of filteredInvoices) {
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
                        <Bar dataKey="actual" fill={`oklch(0.52 0.15 ${accentHue})`} radius={[4, 4, 0, 0]} />
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
                        const rowKey = row.id ?? row.name + idx;
                        const isExpanded = expandedDoctor === rowKey;
                        // Collect invoices for this row
                        const rowInvoices: Invoice[] = row.id && row.type !== "walkin" && row.type !== "legacy"
                          ? (byId[row.id as string] ?? [])
                          : row.type === "walkin"
                          ? walkIn
                          : (byName[row.name] ?? []);
                        return (
                          <Fragment key={rowKey}>
                            <tr
                              key={rowKey}
                              className={`border-b border-border/50 hover:bg-muted/40 transition-colors cursor-pointer select-none ${
                                isExpanded ? "bg-muted/30" : ""
                              }`}
                              onClick={() => setExpandedDoctor(isExpanded ? null : rowKey)}
                            >
                              <td className="py-3 pr-4 font-medium">
                                <span className="flex items-center gap-1.5">
                                  {isExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                  {row.name}
                                </span>
                              </td>
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
                            {isExpanded && rowInvoices.length > 0 && (
                              <tr key={rowKey + "-detail"} className="border-b border-border/50">
                                <td colSpan={7} className="px-0 py-0">
                                  <div className="bg-muted/20 border-l-2 border-teal-400 ml-6 mr-2 mb-2 mt-0.5 overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-border/60 bg-muted/40">
                                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
                                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Patient / Customer</th>
                                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                                          <th className="px-3 py-2"></th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rowInvoices
                                          .slice()
                                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                          .map((inv) => {
                                            const payBadge: Record<string, string> = {
                                              paid:    "bg-green-100 text-green-700",
                                              partial: "bg-amber-100 text-amber-700",
                                              unpaid:  "bg-red-100 text-red-700",
                                            };
                                            return (
                                              <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/40 transition-colors">
                                                <td className="px-3 py-2 font-mono font-semibold">{inv.id.toUpperCase()}</td>
                                                <td className="px-3 py-2 font-medium">{inv.customerName}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{format(parseISO(inv.createdAt), "dd MMM yyyy")}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-teal-700">{rupees(inv.grandTotal)}</td>
                                                <td className="px-3 py-2">
                                                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${payBadge[inv.paymentStatus] ?? payBadge.unpaid}`}>
                                                    {inv.paymentStatus.charAt(0).toUpperCase() + inv.paymentStatus.slice(1)}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                                                  >
                                                    <Eye className="h-3.5 w-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="border-t border-border/60 bg-muted/40">
                                          <td colSpan={3} className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">Total</td>
                                          <td className="px-3 py-2 text-right font-bold text-teal-700">{rupees(row.actual)}</td>
                                          <td colSpan={2}></td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
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

      <InvoicePrintModal
        invoice={selectedInvoice}
        tenant={tenant}
        onClose={() => setSelectedInvoice(null)}
      />
      <BillPrintModal
        bill={selectedBill}
        tenant={tenant}
        onClose={() => setSelectedBill(null)}
      />
    </div>
  );
}
