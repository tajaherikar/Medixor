"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SupplierBill } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ClipboardList, ChevronDown, ChevronRight, CreditCard, IndianRupee } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { format, parseISO } from "date-fns";

interface PurchaseRegisterProps { tenant: string; }

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

function PayStatus({ status }: { status: string }) {
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

export function PurchaseRegister({ tenant }: PurchaseRegisterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payBill, setPayBill] = useState<SupplierBill | null>(null);
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("bank");
  const [payRef, setPayRef] = useState("");

  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery<SupplierBill[]>({
    queryKey: ["supplier-bills", tenant],
    queryFn: () => fetch(`/api/${tenant}/supplier-bills`).then((r) => r.json()),
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

  const totalPurchase = bills.reduce((s, b) => s + b.grandTotal, 0);
  const totalGst      = bills.reduce((s, b) => s + b.totalGst, 0);
  const totalPaid     = bills.reduce((s, b) => s + b.paidAmount, 0);
  const totalDue      = totalPurchase - totalPaid;

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Purchases", value: rupees(totalPurchase), color: "text-foreground" },
          { label: "Total GST (Input)", value: rupees(totalGst), color: "text-blue-600" },
          { label: "Amount Paid", value: rupees(totalPaid), color: "text-green-600" },
          { label: "Balance Due", value: rupees(totalDue), color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`} style={{ fontFamily: "var(--font-jakarta)" }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bills table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Purchase Register
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No supplier bills recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50 text-xs">
                  <TableHead className="w-8 font-semibold text-xs uppercase tracking-wide text-muted-foreground"></TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Supplier</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Invoice #</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Due Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden lg:table-cell">Taxable</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden md:table-cell">GST</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Total</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Paid</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden sm:table-cell">Balance</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => {
                  const balance = bill.grandTotal - bill.paidAmount;
                  const isExpanded = expandedId === bill.id;
                  return (
                    <React.Fragment key={bill.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => setExpandedId(isExpanded ? null : bill.id)}>
                        <TableCell className="text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {bill.supplierName}
                          {/* Show invoice inline on mobile */}
                          <p className="text-xs text-muted-foreground font-mono sm:hidden mt-0.5">{bill.invoiceNumber}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs hidden sm:table-cell">{bill.invoiceNumber}</TableCell>
                        <TableCell className="text-sm hidden md:table-cell">{format(parseISO(bill.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-sm hidden lg:table-cell">{format(parseISO(bill.dueDate), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell">{rupees(bill.taxableAmount)}</TableCell>
                        <TableCell className="text-right text-sm text-blue-600 hidden md:table-cell">{rupees(bill.totalGst)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{rupees(bill.grandTotal)}</TableCell>
                        <TableCell className="text-right text-sm text-green-600 hidden sm:table-cell">{rupees(bill.paidAmount)}</TableCell>
                        <TableCell className="text-right font-semibold text-sm text-red-600 hidden sm:table-cell">{balance > 0 ? rupees(balance) : "—"}</TableCell>
                        <TableCell><PayStatus status={bill.paymentStatus} /></TableCell>
                        <TableCell>
                          {bill.paymentStatus !== "paid" && isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={(e) => { e.stopPropagation(); setPayBill(bill); setPayAmount(String(balance)); }}
                            >
                              <CreditCard className="h-3 w-3" />Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded items */}
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={12} className="py-0 px-4">
                            <div className="py-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Bill Items</p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="text-xs border-0">
                                    <TableHead className="h-7 pl-0">Item</TableHead>
                                    <TableHead className="h-7 hidden sm:table-cell">HSN</TableHead>
                                    <TableHead className="h-7 hidden sm:table-cell">Batch</TableHead>
                                    <TableHead className="h-7 text-right">Qty</TableHead>
                                    <TableHead className="h-7 text-right hidden md:table-cell">Purchase Price</TableHead>
                                    <TableHead className="h-7 text-right hidden md:table-cell">Taxable</TableHead>
                                    <TableHead className="h-7 text-right hidden lg:table-cell">CGST</TableHead>
                                    <TableHead className="h-7 text-right hidden lg:table-cell">SGST</TableHead>
                                    <TableHead className="h-7 text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bill.items.map((item, idx) => (
                                    <TableRow key={idx} className="text-xs border-0">
                                      <TableCell className="py-1.5 pl-0 font-medium">{item.itemName}</TableCell>
                                      <TableCell className="py-1.5 font-mono hidden sm:table-cell">{item.hsnCode}</TableCell>
                                      <TableCell className="py-1.5 font-mono hidden sm:table-cell">{item.batchNumber}</TableCell>
                                      <TableCell className="py-1.5 text-right">{item.quantity}</TableCell>
                                      <TableCell className="py-1.5 text-right hidden md:table-cell">₹{item.purchasePrice}</TableCell>
                                      <TableCell className="py-1.5 text-right hidden md:table-cell">{rupees(item.taxableAmount)}</TableCell>
                                      <TableCell className="py-1.5 text-right text-blue-600 hidden lg:table-cell">{rupees(item.cgst)}</TableCell>
                                      <TableCell className="py-1.5 text-right text-blue-600 hidden lg:table-cell">{rupees(item.sgst)}</TableCell>
                                      <TableCell className="py-1.5 text-right font-semibold">{rupees(item.lineTotal)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={!!payBill} onOpenChange={(o) => !o && setPayBill(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
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
  );
}
