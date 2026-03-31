"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Batch, Invoice } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpiryBadge } from "@/components/ui/expiry-badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  PackageSearch,
  AlertCircle,
  XCircle,
  TrendingUp,
  Package2,
  Clock,
  CalendarDays,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { useSettingsStore } from "@/lib/stores";

interface DashboardProps {
  tenant: string;
}

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export function Dashboard({ tenant }: DashboardProps) {
  const accentHue = useSettingsStore((s) => s.settings.accentHue);
  const lowStockThreshold = useSettingsStore((s) => s.settings.lowStockThreshold ?? 20);

  const { data: batches = [], isLoading } = useQuery<Batch[]>({
    queryKey: ["inventory", tenant, "all", ""],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/inventory`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", tenant],
    queryFn: () => fetch(`/api/${tenant}/invoices`).then((r) => r.json()),
  });

  const active     = batches.filter((b) => b.status === "active");
  const nearExpiry = batches.filter((b) => b.status === "near_expiry");
  const expired    = batches.filter((b) => b.status === "expired");
  const totalItems = batches.reduce((s, b) => s + b.availableQty, 0);

  // Low stock: aggregate per-item total across non-expired batches
  const itemQtyMap: Record<string, { total: number; batches: Batch[] }> = {};
  for (const b of batches) {
    if (b.status !== "expired") {
      if (!itemQtyMap[b.itemName]) itemQtyMap[b.itemName] = { total: 0, batches: [] };
      itemQtyMap[b.itemName].total += b.availableQty;
      itemQtyMap[b.itemName].batches.push(b);
    }
  }
  const lowStockItems = Object.entries(itemQtyMap)
    .filter(([, v]) => v.total < lowStockThreshold)
    .map(([name, v]) => ({ name, total: v.total, batches: v.batches }))
    .sort((a, b) => a.total - b.total);

  // Financial KPIs
  const today      = format(new Date(), "yyyy-MM-dd");
  const thisMonth  = format(new Date(), "yyyy-MM");
  const todaysSales    = invoices
    .filter((i) => i.createdAt.startsWith(today))
    .reduce((s, i) => s + i.grandTotal, 0);
  const monthlyRevenue = invoices
    .filter((i) => i.createdAt.startsWith(thisMonth))
    .reduce((s, i) => s + i.grandTotal, 0);
  const totalOutstanding = invoices
    .filter((i) => i.paymentStatus !== "paid")
    .reduce((s, i) => s + (i.grandTotal - (i.paidAmount ?? 0)), 0);

  // Chart data
  const itemStockMap: Record<string, number> = {};
  for (const b of batches) {
    itemStockMap[b.itemName] = (itemStockMap[b.itemName] ?? 0) + b.availableQty;
  }
  const chartData = Object.entries(itemStockMap)
    .map(([name, qty]) => ({ name: name.split(" ")[0], qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const nearExpiryRef = useRef<HTMLDivElement>(null);
  const expiredRef    = useRef<HTMLDivElement>(null);
  const lowStockRef   = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const statCards = [
    {
      label: "Total Stock",
      sub: "units in inventory",
      value: totalItems,
      icon: TrendingUp,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Active Batches",
      sub: "in-date and available",
      value: active.length,
      icon: PackageSearch,
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
    },
    {
      label: "Near Expiry",
      sub: "expiring within 90 days",
      value: nearExpiry.length,
      icon: AlertCircle,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      alert: nearExpiry.length > 0,
    },
    {
      label: "Expired",
      sub: "require immediate action",
      value: expired.length,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      alert: expired.length > 0,
    },
    {
      label: "Low Stock",
      sub: `below ${lowStockThreshold} units`,
      value: lowStockItems.length,
      icon: ShoppingCart,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      alert: lowStockItems.length > 0,
    },
  ];

  const onStatCardClick = (label: string) => {
    if (label === "Near Expiry") {
      nearExpiryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (label === "Expired") {
      expiredRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (label === "Low Stock") {
      lowStockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (label === "Active Batches") {
      router.push(`/${tenant}/inventory?status=active`);
      return;
    }

    if (label === "Total Stock") {
      router.push(`/${tenant}/inventory`);
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Today's Sales", value: rupees(todaysSales), sub: format(new Date(), "dd MMM yyyy"), icon: CalendarDays, iconBg: "bg-teal-50", iconColor: "text-teal-600", valueCls: "text-teal-700" },
          { label: "Monthly Revenue", value: rupees(monthlyRevenue), sub: format(new Date(), "MMMM yyyy"), icon: TrendingUp, iconBg: "bg-primary/10", iconColor: "text-primary", valueCls: "text-foreground" },
          { label: "Total Outstanding", value: rupees(totalOutstanding), sub: "unpaid + partially paid", icon: Clock, iconBg: "bg-red-50", iconColor: "text-red-500", valueCls: "text-red-600" },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconColor, valueCls }) => (
          <Card key={label} className="shadow-sm border border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
                {invoicesLoading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold leading-none ${valueCls}`} style={{ fontFamily: "var(--font-jakarta)" }}>
                    {value}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ label, sub, value, icon: Icon, iconBg, iconColor, alert }) => (
          <Card
            key={label}
            onClick={() => onStatCardClick(label)}
            className={`shadow-sm transition-shadow hover:shadow-lg ${
              alert ? "border-amber-200" : ""
            } cursor-pointer ring-1 ring-transparent hover:ring-amber-200`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                {alert && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
                )}
              </div>
              {isLoading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1.5" />
                  <Skeleton className="h-3 w-24" />
                </>
              ) : (
                <>
                  <p
                    className="text-3xl font-bold leading-none mb-1"
                    style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
                  >
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Level Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Stock by Item</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Total units available per item</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "var(--font-inter)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fontFamily: "var(--font-inter)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`${v} units`, "Stock"]}
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i % 2 === 0 ? `oklch(0.52 0.15 ${accentHue})` : `oklch(0.72 0.11 ${accentHue})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div ref={lowStockRef} id="low-stock-section" className="scroll-mt-20">
          <Card className="shadow-sm border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-orange-100">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                </div>
                Low Stock Items
                <span className="ml-1 text-xs font-normal bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""}
                </span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Threshold: {lowStockThreshold} units
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {lowStockItems.map((item, i) => (
                <div
                  key={item.name}
                  className={`flex items-center justify-between py-3 ${
                    i < lowStockItems.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-50 shrink-0">
                      <Package2 className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.batches.length} batch{item.batches.length > 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        item.total === 0 ? "text-muted-foreground" : "text-orange-600"
                      }`}
                    >
                      {item.total} units
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Near Expiry Alerts */}
      {nearExpiry.length > 0 && (
        <div ref={nearExpiryRef} id="near-expiry-section" className="scroll-mt-20">
          <Card className="shadow-sm border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              Near Expiry Batches
              <span className="ml-1 text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {nearExpiry.length} batch{nearExpiry.length > 1 ? "es" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {nearExpiry.map((b, i) => (
              <div
                key={b.id}
                className={`flex items-center justify-between py-3 ${
                  i < nearExpiry.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 shrink-0">
                    <Package2 className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{b.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch <span className="font-mono">{b.batchNumber}</span> · {b.supplierName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {b.availableQty} units
                  </span>
                  <ExpiryBadge expiryDate={b.expiryDate} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      )}

      {/* Expired Batches */}
      {expired.length > 0 && (
        <div ref={expiredRef} id="expired-section" className="scroll-mt-20">
          <Card className="shadow-sm border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-100">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              Expired Batches
              <span className="ml-1 text-xs font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {expired.length} batch{expired.length > 1 ? "es" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {expired.map((b, i) => (
              <div
                key={b.id}
                className={`flex items-center justify-between py-3 ${
                  i < expired.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-50 shrink-0">
                    <Package2 className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{b.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch <span className="font-mono">{b.batchNumber}</span> · {b.supplierName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {b.availableQty} units
                  </span>
                  <ExpiryBadge expiryDate={b.expiryDate} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
