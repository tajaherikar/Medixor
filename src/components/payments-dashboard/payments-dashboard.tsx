"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Invoice, Customer, SupplierBill, Supplier } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Banknote, CreditCard, IndianRupee, CheckCircle2, Clock, Users, MessageCircle, Mail, Building } from "lucide-react";
import { useAuthStore, useSettingsStore } from "@/lib/stores";
import { format, parseISO, isAfter } from "date-fns";

interface PaymentsDashboardProps { tenant: string; }

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function PayBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid:    "bg-green-100 text-green-700 border-green-200",
    partial: "bg-amber-100 text-amber-700 border-amber-200",
    unpaid:  "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium border ${map[status] ?? map.unpaid}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function PaymentsDashboard({ tenant }: PaymentsDashboardProps) {
  const [view, setView] = useState<"customer" | "supplier">("customer");
  const [collectInvoice, setCollectInvoice] = useState<Invoice | null>(null);
  const [payBill, setPayBill] = useState<SupplierBill | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const businessName = useSettingsStore((s) => s.settings.businessName) || "Us";
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: loadingInv } = useQuery<Invoice[]>({
    queryKey: ["invoices", tenant],
    queryFn: () => fetch(`/api/${tenant}/invoices`).then((r) => r.json()),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: () => fetch(`/api/${tenant}/customers`).then((r) => r.json()),
  });

  const { data: bills = [], isLoading: loadingBills } = useQuery<SupplierBill[]>({
    queryKey: ["supplier-bills", tenant],
    queryFn: () => fetch(`/api/${tenant}/supplier-bills`).then((r) => r.json()),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers", tenant],
    queryFn: () => fetch(`/api/${tenant}/suppliers`).then((r) => r.json()),
  });

  const customerMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const supplierMap = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!collectInvoice) return;
      await fetch(`/api/${tenant}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant,
          partyId: collectInvoice.customerId,
          partyType: "customer",
          invoiceId: collectInvoice.id,
          amount: Number(payAmount),
          date: format(new Date(), "yyyy-MM-dd"),
          mode: payMode,
          reference: payRef || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", tenant] });
      setCollectInvoice(null);
      setPayAmount("");
      setPayRef("");
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!payBill) return;
      await fetch(`/api/${tenant}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: tenant,
          partyId: payBill.supplierId,
          partyType: "supplier",
          invoiceId: payBill.id,
          amount: Number(payAmount),
          date: format(new Date(), "yyyy-MM-dd"),
          mode: payMode,
          reference: payRef || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-bills", tenant] });
      setPayBill(null);
      setPayAmount("");
      setPayRef("");
    },
  });

  // ─── CUSTOMER LEDGER LOGIC ─────────────────────────────────────────────────────

  const customerLedger = customers.map((c) => {
    const custInvoices = invoices.filter((i) => i.customerId === c.id);
    const totalBilled   = custInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalReceived = custInvoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
    const outstanding   = totalBilled - totalReceived;
    const overdueCount  = custInvoices.filter(
      (i) => i.paymentStatus !== "paid" && i.dueDate && isAfter(new Date(), parseISO(i.dueDate))
    ).length;
    return { ...c, totalBilled, totalReceived, outstanding, overdueCount, invoices: custInvoices };
  }).filter((c) => c.invoices.length > 0);

  const totalOutstandingCust  = customerLedger.reduce((s, c) => s + c.outstanding, 0);
  const totalBilledAll        = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalGstOutputAll     = invoices.reduce((s, i) => s + i.totalGst, 0);
  const totalReceivedAll      = invoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const overdueInvoices       = invoices.filter(
    (i) => i.paymentStatus !== "paid" && i.dueDate && isAfter(new Date(), parseISO(i.dueDate))
  ).length;

  const filteredInvoices = invoices.filter((i) =>
    (selectedCustomer === "all" || i.customerId === selectedCustomer) &&
    i.paymentStatus !== "paid"
  );

  // ─── PURCHASE LEDGER LOGIC ────────────────────────────────────────────────────

  const supplierLedger = suppliers.map((s) => {
    const supplierBills = bills.filter((b) => b.supplierId === s.id);
    const totalPurchased = supplierBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalPaid      = supplierBills.reduce((sum, b) => sum + (b.paidAmount ?? 0), 0);
    const outstanding    = totalPurchased - totalPaid;
    const overdueCount   = supplierBills.filter(
      (b) => b.paymentStatus !== "paid" && b.dueDate && isAfter(new Date(), parseISO(b.dueDate))
    ).length;
    return { ...s, totalPurchased, totalPaid, outstanding, overdueCount, bills: supplierBills };
  }).filter((s) => s.bills.length > 0);

  const totalOutstandingSupp = supplierLedger.reduce((s, sup) => s + sup.outstanding, 0);
  const totalPurchasedAll    = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalGstAll          = bills.reduce((s, b) => s + b.totalGst, 0);
  const totalPaidAll         = bills.reduce((s, b) => s + (b.paidAmount ?? 0), 0);
  const overdueBills         = bills.filter(
    (b) => b.paymentStatus !== "paid" && b.dueDate && isAfter(new Date(), parseISO(b.dueDate))
  ).length;

  const filteredBills = bills.filter((b) =>
    (selectedSupplier === "all" || b.supplierId === selectedSupplier) &&
    b.paymentStatus !== "paid"
  );

  const isLoading = view === "customer" ? loadingInv : loadingBills;

  return (
    <>
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={view === "customer" ? "default" : "outline"}
          onClick={() => setView("customer")}
          className="flex-1"
        >
          <Users className="h-4 w-4 mr-2" />
          Customer Ledger
        </Button>
        <Button
          variant={view === "supplier" ? "default" : "outline"}
          onClick={() => setView("supplier")}
          className="flex-1"
        >
          <Building className="h-4 w-4 mr-2" />
          Purchase Ledger
        </Button>
      </div>

      {/* CUSTOMER LEDGER VIEW */}
      {view === "customer" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Billed", value: rupees(totalBilledAll), color: "text-foreground", icon: IndianRupee },
              { label: "Total GST (Output)", value: rupees(totalGstOutputAll), color: "text-blue-600", icon: CheckCircle2 },
              { label: "Amount Received", value: rupees(totalReceivedAll), color: "text-green-600", icon: Banknote },
              { label: "Balance Due", value: rupees(totalOutstandingCust), color: "text-red-600", icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold ${color}`} style={{ fontFamily: "var(--font-jakarta)" }}>{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Customer Ledger Summary */}
          <Card className="shadow-sm mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Customer Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {isLoading ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Total Billed</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Received</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Outstanding</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerLedger.map((c) => (
                      <TableRow key={c.id} className={`text-sm ${c.outstanding > 0 ? "cursor-pointer hover:bg-muted/40" : ""}`}
                        onClick={() => c.outstanding > 0 && setSelectedCustomer(c.id)}>
                        <TableCell className="font-medium">
                          {c.name}
                          {c.overdueCount > 0 && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium md:hidden">
                              {c.overdueCount} overdue
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{rupees(c.totalBilled)}</TableCell>
                        <TableCell className="text-right text-green-600 hidden sm:table-cell">{rupees(c.totalReceived)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {c.outstanding > 0 ? rupees(c.outstanding) : <span className="text-green-600">Cleared</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.overdueCount > 0 && (
                            <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                              {c.overdueCount} overdue
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pending Invoices
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Filter:</Label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="all">All Customers</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {isLoading ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                  No pending invoices
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Invoice</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Invoice Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Due Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Total</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden md:table-cell">Paid</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Balance</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => {
                      const balance = inv.grandTotal - (inv.paidAmount ?? 0);
                      const overdue = inv.dueDate ? isAfter(new Date(), parseISO(inv.dueDate)) : false;
                      const customer = customerMap.get(inv.customerId);
                      const invoiceDate = format(parseISO(inv.createdAt), "dd MMM yyyy");
                      const waMsg = [
                        `Dear ${inv.customerName},`,
                        ``,
                        `Reminder for pending invoice:`,
                        ``,
                        `Invoice: ${inv.id.toUpperCase()}`,
                        `Date: ${invoiceDate}`,
                        `Amount Due: \u20B9${balance.toLocaleString("en-IN")}`,
                        ``,
                        `Kindly arrange payment at your earliest convenience.`,
                        ``,
                        `If already paid, please ignore.`,
                        ``,
                        `\u2013 ${businessName}`,
                      ].join("\n");
                      const emailBody = [
                        `Dear ${inv.customerName},`,
                        ``,
                        `This is a gentle reminder regarding the following invoice:`,
                        ``,
                        `Invoice No: ${inv.id.toUpperCase()}`,
                        `Invoice Date: ${invoiceDate}`,
                        `Total Amount: \u20B9${inv.grandTotal.toLocaleString("en-IN")}`,
                        `Outstanding Balance: \u20B9${balance.toLocaleString("en-IN")}`,
                        ``,
                        `We kindly request you to process the payment at your earliest convenience.`,
                        ``,
                        `If the payment has already been made, please disregard this message.`,
                        ``,
                        `Thank you for your continued trust in us.`,
                        ``,
                        `Warm regards,`,
                        businessName,
                      ].join("\n");
                      const waPhone = customer?.phone?.replace(/\D/g, "") ?? "";
                      const waNum = waPhone.length === 10 ? `91${waPhone}` : waPhone.length > 10 ? waPhone : "";
                      const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(waMsg)}`;
                      const emailUrl = `mailto:${customer?.email ?? ""}?subject=${encodeURIComponent(`Payment Reminder \u2014 Invoice ${inv.id.toUpperCase()}`)}&body=${encodeURIComponent(emailBody)}`;
                      return (
                        <TableRow key={inv.id} className="text-sm">
                          <TableCell className="font-mono text-xs font-semibold">{inv.id.toUpperCase()}</TableCell>
                          <TableCell className="font-medium">
                            {inv.customerName}
                            <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
                              Due: {inv.dueDate ? format(parseISO(inv.dueDate), "dd MMM yyyy") : "—"}
                              {overdue && <span className="text-red-600 ml-1">(overdue)</span>}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{format(parseISO(inv.createdAt), "dd MMM yyyy")}</TableCell>
                          <TableCell className={`hidden sm:table-cell ${overdue ? "text-red-600 font-semibold" : ""}`}>
                            {inv.dueDate ? format(parseISO(inv.dueDate), "dd MMM yyyy") : "—"}
                            {overdue && <span className="ml-1 text-xs opacity-75">(overdue)</span>}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{rupees(inv.grandTotal)}</TableCell>
                          <TableCell className="text-right text-green-600 hidden md:table-cell">{rupees(inv.paidAmount ?? 0)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{rupees(balance)}</TableCell>
                          <TableCell><PayBadge status={inv.paymentStatus} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50">
                                  <MessageCircle className="h-3 w-3" /><span className="hidden sm:inline">WA</span>
                                </Button>
                              </a>
                              <a href={emailUrl}>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-blue-700 border-blue-300 hover:bg-blue-50">
                                  <Mail className="h-3 w-3" /><span className="hidden sm:inline">Mail</span>
                                </Button>
                              </a>
                              {isAdmin && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => { setCollectInvoice(inv); setPayAmount(String(balance)); }}
                                >
                                  <Banknote className="h-3 w-3" />Collect
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Collect Payment Dialog */}
          <Dialog open={!!collectInvoice} onOpenChange={(o) => !o && setCollectInvoice(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  Collect Payment from {collectInvoice?.customerName}
                </DialogTitle>
              </DialogHeader>
              {collectInvoice && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{collectInvoice.id.toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date</span><span>{format(parseISO(collectInvoice.createdAt), "dd MMM yyyy")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Grand Total</span><span className="font-semibold">{rupees(collectInvoice.grandTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Already Collected</span><span className="text-green-600">{rupees(collectInvoice.paidAmount ?? 0)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-semibold"><span>Balance Due</span><span className="text-red-600">{rupees(collectInvoice.grandTotal - (collectInvoice.paidAmount ?? 0))}</span></div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Collection Amount (₹)</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Payment Mode</Label>
                      <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reference (optional)</Label>
                      <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / Cheque no." />
                    </div>
                  </div>

                  <Button
                    onClick={() => collectMutation.mutate()}
                    disabled={!payAmount || Number(payAmount) <= 0 || collectMutation.isPending}
                    className="w-full"
                  >
                    {collectMutation.isPending ? "Recording…" : "Record Collection"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* PURCHASE LEDGER VIEW */}
      {view === "supplier" && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Purchased", value: rupees(totalPurchasedAll), color: "text-foreground", icon: IndianRupee },
              { label: "Total GST (Input)", value: rupees(totalGstAll), color: "text-blue-600", icon: CheckCircle2 },
              { label: "Amount Paid", value: rupees(totalPaidAll), color: "text-green-600", icon: Banknote },
              { label: "Balance Due", value: rupees(totalOutstandingSupp), color: "text-red-600", icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold ${color}`} style={{ fontFamily: "var(--font-jakarta)" }}>{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Supplier Ledger Summary */}
          <Card className="shadow-sm mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Purchase Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {isLoading ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Supplier</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Total Purchased</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Paid</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Outstanding</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierLedger.map((s) => (
                      <TableRow key={s.id} className={`text-sm ${s.outstanding > 0 ? "cursor-pointer hover:bg-muted/40" : ""}`}
                        onClick={() => s.outstanding > 0 && setSelectedSupplier(s.id)}>
                        <TableCell className="font-medium">
                          {s.name}
                          {s.overdueCount > 0 && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium md:hidden">
                              {s.overdueCount} overdue
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{rupees(s.totalPurchased)}</TableCell>
                        <TableCell className="text-right text-green-600 hidden sm:table-cell">{rupees(s.totalPaid)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {s.outstanding > 0 ? rupees(s.outstanding) : <span className="text-green-600">Cleared</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {s.overdueCount > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                              {s.overdueCount} overdue
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Bills */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Pending Bills
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Filter:</Label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="all">All Suppliers</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {isLoading ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : filteredBills.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                  No pending bills
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Invoice#</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Supplier</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">GRN Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Due Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Total</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden md:table-cell">Paid</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Balance</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => {
                      const balance = bill.grandTotal - (bill.paidAmount ?? 0);
                      const overdue = bill.dueDate ? isAfter(new Date(), parseISO(bill.dueDate)) : false;
                      return (
                        <TableRow key={bill.id} className="text-sm">
                          <TableCell className="font-mono text-xs font-semibold">{bill.invoiceNumber}</TableCell>
                          <TableCell className="font-medium">
                            {bill.supplierName}
                            <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
                              Due: {bill.dueDate ? format(parseISO(bill.dueDate), "dd MMM yyyy") : "—"}
                              {overdue && <span className="text-red-600 ml-1">(overdue)</span>}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{bill.date ? format(parseISO(bill.date), "dd MMM yyyy") : "—"}</TableCell>
                          <TableCell className={`hidden sm:table-cell ${overdue ? "text-red-600 font-semibold" : ""}`}>
                            {bill.dueDate ? format(parseISO(bill.dueDate), "dd MMM yyyy") : "—"}
                            {overdue && <span className="ml-1 text-xs opacity-75">(overdue)</span>}
                          </TableCell>
                          <TableCell className="text-right hidden sm:table-cell">{rupees(bill.grandTotal)}</TableCell>
                          <TableCell className="text-right text-green-600 hidden md:table-cell">{rupees(bill.paidAmount ?? 0)}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">{rupees(balance)}</TableCell>
                          <TableCell><PayBadge status={bill.paymentStatus} /></TableCell>
                          <TableCell>
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => { setPayBill(bill); setPayAmount(String(balance)); }}
                              >
                                <Banknote className="h-3 w-3" />Pay
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pay Bill Dialog */}
          <Dialog open={!!payBill} onOpenChange={(o) => !o && setPayBill(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  Record Payment to {payBill?.supplierName}
                </DialogTitle>
              </DialogHeader>
              {payBill && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{payBill.invoiceNumber}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{rupees(payBill.grandTotal)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-green-600">{rupees(payBill.paidAmount)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-semibold"><span>Balance</span><span className="text-red-600">{rupees(payBill.grandTotal - payBill.paidAmount)}</span></div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Payment Amount (₹)</Label>
                    <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Payment Mode</Label>
                      <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reference (optional)</Label>
                      <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / Cheque no." />
                    </div>
                  </div>

                  <Button
                    onClick={() => payMutation.mutate()}
                    disabled={!payAmount || Number(payAmount) <= 0 || payMutation.isPending}
                    className="w-full"
                  >
                    {payMutation.isPending ? "Recording…" : "Record Payment"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
