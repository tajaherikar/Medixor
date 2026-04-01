"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { Customer, Doctor, BatchSelectionStrategy, DiscountType, GstRate, PaymentStatus, UnitType } from "@/lib/types";
import { calcLineTotal, calcGrandTotal } from "@/lib/discount";
import { BatchSelector, SelectedBatchAllocation } from "@/components/batch-selector/batch-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { InvoicePrintModal } from "@/components/reports/invoice-print-modal";
import { Invoice } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { useAuthStore, useSettingsStore } from "@/lib/stores";

interface LineItem {
  batchId: string;
  itemName: string;
  unitType?: UnitType;
  packSize?: number;
  hsnCode: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
  gstRate: GstRate;
}

interface InvoiceBuilderProps {
  tenant: string;
}

export function InvoiceBuilder({ tenant }: InvoiceBuilderProps) {
  const [customerId, setCustomerId] = useState<string>("");
  const [strategy, setStrategy] = useState<BatchSelectionStrategy>("fefo");
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [referredBy, setReferredBy] = useState("");
  const [referredById, setReferredById] = useState("");
  const [customerDiscountType, setCustomerDiscountType] = useState<DiscountType>("percentage");
  const [customerDiscountValue, setCustomerDiscountValue] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paidAmount, setPaidAmount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/customers`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["doctors", tenant],
    queryFn: () => fetch(`/api/${tenant}/doctors`).then((r) => r.json()),
  });

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Pre-fill customer discount when customer is selected
  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const c = customers.find((cu) => cu.id === id);
    if (c?.discount) {
      setCustomerDiscountType(c.discount.type);
      setCustomerDiscountValue(c.discount.value);
    } else {
      setCustomerDiscountValue(0);
    }
  }

  function handleAddAllocations(allocations: SelectedBatchAllocation[]) {
    setLineItems((prev) => {
      const next = [...prev];
      for (const a of allocations) {
        const existing = next.findIndex((l) => l.batchId === a.batchId);
        if (existing >= 0) {
          next[existing] = { ...next[existing], quantity: next[existing].quantity + a.qty };
        } else {
          next.push({
            batchId: a.batchId,
            itemName: a.itemName,
            ...(a.unitType && { unitType: a.unitType }),
            ...(a.packSize && { packSize: a.packSize }),
            hsnCode: "3004",
            batchNumber: a.batchNumber,
            expiryDate: a.expiryDate,
            mrp: a.mrp,
            quantity: a.qty,
            discountType: "percentage",
            discountValue: 0,
            gstRate: 12,
          });
        }
      }
      return next;
    });
  }

  function removeLineItem(batchId: string) {
    setLineItems((prev) => prev.filter((l) => l.batchId !== batchId));
  }

  function updateLineItem(batchId: string, key: keyof LineItem, value: unknown) {
    setLineItems((prev) =>
      prev.map((l) => (l.batchId === batchId ? { ...l, [key]: value } : l))
    );
  }

  const subtotal = lineItems.reduce(
    (sum, l) => sum + calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue),
    0
  );

  const { customerDiscountAmount, grandTotal: grandTotalPreGst } = calcGrandTotal(
    subtotal,
    customerDiscountValue > 0 ? customerDiscountType : undefined,
    customerDiscountValue > 0 ? customerDiscountValue : undefined
  );

  // GST per line item
  const lineGst = lineItems.map((l) => {
    const taxable = calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue);
    const gstAmt = taxable * (l.gstRate / 100);
    return { taxable, cgst: gstAmt / 2, sgst: gstAmt / 2, gstAmt };
  });
  const totalGst = lineGst.reduce((s, g) => s + g.gstAmt, 0);
  const grandTotal = grandTotalPreGst + totalGst;

  async function handleSave() {
    if (!customerId || lineItems.length === 0) return;
    setSaveError(null);
    const payload = {
      tenantId: tenant,
      customerId,
      customerName: selectedCustomer?.name ?? "",
      ...(selectedCustomer?.gstNumber && { customerGstNumber: selectedCustomer.gstNumber }),
      ...(selectedCustomer?.licenseNumber && { customerLicenseNumber: selectedCustomer.licenseNumber }),
      ...(selectedCustomer?.address && { customerAddress: selectedCustomer.address }),
      lineItems: lineItems.map((l, i) => {
        const lt = calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue);
        const gstAmt = lt * (l.gstRate / 100);
        return {
          ...l,
          lineTotal: lt,
          taxableAmount: lt,
          gstAmount: gstAmt,
          cgst: gstAmt / 2,
          sgst: gstAmt / 2,
          lineTotalWithGst: lt + gstAmt,
        };
      }),
      ...(referredBy.trim() && { referredBy: referredBy.trim() }),
      ...(referredById && { referredById }),
      customerDiscountType,
      customerDiscountValue,
      subtotal,
      customerDiscountAmount,
      taxableAmount: grandTotalPreGst,
      totalGst,
      grandTotal,
      paymentStatus,
      paidAmount: paymentStatus === "paid" ? grandTotal : paidAmount,
      dueDate: addDays(new Date(), 30).toISOString().split("T")[0],
    };
    const res = await fetch(`/api/${tenant}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: string }).error ?? `Save failed (${res.status}). Please try again.`;
      setSaveError(msg);
      toast.error("Failed to save invoice", { description: msg });
      return;
    }
    // Invalidate caches so Reports and Inventory reflect changes immediately
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invoices", tenant] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", tenant] }),
    ]);
    const savedInvoice = await res.json() as Invoice;
    setLastSavedInvoice(savedInvoice);
    toast.success("Invoice saved", {
      description: `₹${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })} · ${selectedCustomer?.name ?? ""}`,
    });
    setSaved(true);
    setTimeout(() => {
      setLineItems([]);
      setCustomerId("");
      setCustomerDiscountValue(0);
      setPaymentStatus("unpaid");
      setPaidAmount(0);
      setReferredBy("");
      setReferredById("");
      setSaved(false);
      // keep lastSavedInvoice so user can still print after reset
    }, 1500);
  }

  return (
    <div className="space-y-6">
      {/* Customer + Strategy row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={handleCustomerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCustomer && (selectedCustomer.gstNumber || selectedCustomer.licenseNumber || selectedCustomer.address) && (
            <div className="flex flex-wrap gap-3 mt-1">
              {selectedCustomer.gstNumber && (
                <span className="text-xs text-muted-foreground">
                  GST: <span className="font-mono font-medium text-foreground">{selectedCustomer.gstNumber}</span>
                </span>
              )}
              {selectedCustomer.licenseNumber && (
                <span className="text-xs text-muted-foreground">
                  License: <span className="font-mono font-medium text-foreground">{selectedCustomer.licenseNumber}</span>
                </span>
              )}
              {selectedCustomer.address && (
                <span className="text-xs text-muted-foreground">{selectedCustomer.address}</span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>Reference (Doctor / Lab / Consultant)</Label>
          <Select
            value={referredById || "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") { setReferredById(""); setReferredBy(""); return; }
              setReferredById(v);
              const doc = doctors.find((d) => d.id === v);
              setReferredBy(doc?.name ?? "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="No reference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No reference / Walk-in</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}{" "}
                  <span className="text-muted-foreground text-xs capitalize">({d.type})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Batch Strategy</Label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as BatchSelectionStrategy)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fefo">FEFO — First Expiry First Out</SelectItem>
              <SelectItem value="fifo">FIFO — First In First Out</SelectItem>
              <SelectItem value="manual">Manual Selection</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Batch Selector */}
      <BatchSelector
        tenant={tenant}
        strategy={strategy}
        onAdd={handleAddAllocations}
      />

      {/* Line Items Table */}
      {lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Lines</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden md:table-cell">Unit</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead className="text-right">Taxable</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((l) => {
                  const lineTotal = calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue);
                  const gstAmt = lineTotal * (l.gstRate / 100);
                  const halfGst = gstAmt / 2;
                  return (
                    <TableRow key={l.batchId}>
                      <TableCell className="font-medium">{l.itemName}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {l.unitType ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            {l.unitType}{l.packSize ? ` ${l.packSize}` : ""}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={l.hsnCode}
                          onChange={(e) => updateLineItem(l.batchId, "hsnCode", e.target.value)}
                          className="w-20 h-7 text-xs font-mono"
                          placeholder="HSN"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{l.batchNumber}</TableCell>
                      <TableCell className="text-xs">{format(parseISO(l.expiryDate), "dd MMM yy")}</TableCell>
                      <TableCell>₹{l.mrp}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={l.quantity}
                          onChange={(e) => updateLineItem(l.batchId, "quantity", Number(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={l.discountType}
                            onValueChange={(v) => updateLineItem(l.batchId, "discountType", v)}
                          >
                            <SelectTrigger className="w-20 h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="flat">₹</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            value={l.discountValue}
                            onChange={(e) => updateLineItem(l.batchId, "discountValue", Number(e.target.value))}
                            className="w-16 h-7 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(l.gstRate)}
                          onValueChange={(v) => updateLineItem(l.batchId, "gstRate", Number(v) as GstRate)}
                        >
                          <SelectTrigger className="w-20 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {([0, 5, 12, 18, 28] as GstRate[]).map((r) => (
                              <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right text-sm">₹{lineTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm text-blue-600">₹{halfGst.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm text-blue-600">₹{halfGst.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{(lineTotal + gstAmt).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(l.batchId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex gap-8">
                <span className="text-muted-foreground">Subtotal (before GST)</span>
                <span className="font-medium w-32 text-right">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">Customer Discount</span>
                <Select value={customerDiscountType} onValueChange={(v) => setCustomerDiscountType(v as DiscountType)}>
                  <SelectTrigger className="w-24 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="flat">Flat ₹</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={customerDiscountValue}
                  onChange={(e) => setCustomerDiscountValue(Number(e.target.value))}
                  className="w-20 h-7 text-xs"
                />
                <span className="font-medium w-32 text-right text-red-600">−₹{customerDiscountAmount.toFixed(2)}</span>
              </div>

              <div className="flex gap-8 text-blue-700">
                <span>CGST</span>
                <span className="font-medium w-32 text-right">₹{(totalGst / 2).toFixed(2)}</span>
              </div>
              <div className="flex gap-8 text-blue-700">
                <span>SGST</span>
                <span className="font-medium w-32 text-right">₹{(totalGst / 2).toFixed(2)}</span>
              </div>

              <Separator className="w-full" />
              <div className="flex gap-8 text-base font-semibold">
                <span>Grand Total (incl. GST)</span>
                <span className="w-32 text-right">₹{grandTotal.toFixed(2)}</span>
              </div>

              {/* Payment status */}
              <Separator className="w-full" />
              <div className="flex gap-2 items-center w-full justify-end">
                <span className="text-muted-foreground text-sm">Payment Status</span>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
                {paymentStatus === "partial" && (
                  <Input
                    type="number"
                    min={0}
                    max={grandTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-28 h-8 text-xs"
                    placeholder="Amount paid"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!customerId || lineItems.length === 0 || saved || !isAdmin}
          className="w-full sm:w-auto"
          title={!isAdmin ? "Admin access required" : undefined}
        >
          {saved ? "Invoice Saved ✓" : "Save Invoice"}
        </Button>
        {lastSavedInvoice && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setPrintInvoice(lastSavedInvoice)}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Last Invoice
          </Button>
        )}
      </div>
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}
      <InvoicePrintModal
        invoice={printInvoice}
        tenant={tenant}
        onClose={() => setPrintInvoice(null)}
      />
    </div>
  );
}
