"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Invoice, Customer } from "@/lib/types";
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
import { Banknote, CreditCard, IndianRupee, CheckCircle2, Clock, Users } from "lucide-react";
import { format, parseISO, isAfter } from "date-fns";

interface OutstandingProps { tenant: string; }

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

export function OutstandingTracker({ tenant }: OutstandingProps) {
  const [collectInvoice, setCollectInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading: loadingInv } = useQuery<Invoice[]>({
    queryKey: ["invoices", tenant],
    queryFn: () => fetch(`/api/${tenant}/invoices`).then((r) => r.json()),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: () => fetch(`/api/${tenant}/customers`).then((r) => r.json()),
  });

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

  // Group by customer for ledger view
  const customerLedger = customers.map((c) => {
    const custInvoices = invoices.filter((i) => i.customerId === c.id);
    const totalBilled   = custInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalReceived = custInvoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
    const outstanding   = totalBilled - totalReceived;
    const overdueCount  = custInvoices.filter(
      (i) => i.paymentStatus !== "paid" && isAfter(new Date(), parseISO(i.dueDate))
    ).length;
    return { ...c, totalBilled, totalReceived, outstanding, overdueCount, invoices: custInvoices };
  }).filter((c) => c.invoices.length > 0);

  const totalOutstanding  = customerLedger.reduce((s, c) => s + c.outstanding, 0);
  const totalBilledAll    = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalReceivedAll  = invoices.reduce((s, i) => s + (i.paidAmount ?? 0), 0);
  const overdueInvoices   = invoices.filter(
    (i) => i.paymentStatus !== "paid" && isAfter(new Date(), parseISO(i.dueDate))
  ).length;

  const filteredInvoices = invoices.filter((i) =>
    (selectedCustomer === "all" || i.customerId === selectedCustomer) &&
    i.paymentStatus !== "paid"
  );

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Billed", value: rupees(totalBilledAll), color: "text-foreground", icon: IndianRupee },
          { label: "Received", value: rupees(totalReceivedAll), color: "text-green-600", icon: CheckCircle2 },
          { label: "Outstanding", value: rupees(totalOutstanding), color: "text-red-600", icon: Clock },
          { label: "Overdue Invoices", value: String(overdueInvoices), color: "text-orange-600", icon: Banknote },
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
          {loadingInv ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Billed</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerLedger.map((c) => (
                  <TableRow key={c.id} className={`text-sm ${c.outstanding > 0 ? "cursor-pointer hover:bg-muted/40" : ""}`}
                    onClick={() => c.outstanding > 0 && setSelectedCustomer(c.id)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{rupees(c.totalBilled)}</TableCell>
                    <TableCell className="text-right text-green-600">{rupees(c.totalReceived)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {c.outstanding > 0 ? rupees(c.outstanding) : <span className="text-green-600">Cleared</span>}
                    </TableCell>
                    <TableCell>
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
          {loadingInv ? <div className="p-6"><Skeleton className="h-24 w-full" /></div> : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
              No pending invoices
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => {
                  const balance = inv.grandTotal - (inv.paidAmount ?? 0);
                  const overdue = isAfter(new Date(), parseISO(inv.dueDate));
                  return (
                    <TableRow key={inv.id} className="text-sm">
                      <TableCell className="font-mono text-xs font-semibold">{inv.id.toUpperCase()}</TableCell>
                      <TableCell className="font-medium">{inv.customerName}</TableCell>
                      <TableCell>{format(parseISO(inv.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell className={overdue ? "text-red-600 font-semibold" : ""}>
                        {format(parseISO(inv.dueDate), "dd MMM yyyy")}
                        {overdue && <span className="ml-1 text-xs opacity-75">(overdue)</span>}
                      </TableCell>
                      <TableCell className="text-right">{rupees(inv.grandTotal)}</TableCell>
                      <TableCell className="text-right text-green-600">{rupees(inv.paidAmount ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{rupees(balance)}</TableCell>
                      <TableCell><PayBadge status={inv.paymentStatus} /></TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setCollectInvoice(inv); setPayAmount(String(balance)); }}
                        >
                          <Banknote className="h-3 w-3" />Collect
                        </Button>
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
  );
}
