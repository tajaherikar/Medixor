"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer, BatchSelectionStrategy, DiscountType } from "@/lib/types";
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
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LineItem {
  batchId: string;
  itemName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  discountType: DiscountType;
  discountValue: number;
}

interface InvoiceBuilderProps {
  tenant: string;
}

export function InvoiceBuilder({ tenant }: InvoiceBuilderProps) {
  const [customerId, setCustomerId] = useState<string>("");
  const [strategy, setStrategy] = useState<BatchSelectionStrategy>("fefo");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [customerDiscountType, setCustomerDiscountType] = useState<DiscountType>("percentage");
  const [customerDiscountValue, setCustomerDiscountValue] = useState(0);
  const [saved, setSaved] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/customers`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
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
            batchNumber: a.batchNumber,
            expiryDate: a.expiryDate,
            mrp: a.mrp,
            quantity: a.qty,
            discountType: "percentage",
            discountValue: 0,
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

  const { customerDiscountAmount, grandTotal } = calcGrandTotal(
    subtotal,
    customerDiscountValue > 0 ? customerDiscountType : undefined,
    customerDiscountValue > 0 ? customerDiscountValue : undefined
  );

  async function handleSave() {
    if (!customerId || lineItems.length === 0) return;
    const payload = {
      tenantId: tenant,
      customerId,
      customerName: selectedCustomer?.name ?? "",
      lineItems: lineItems.map((l) => ({
        ...l,
        lineTotal: calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue),
      })),
      customerDiscountType,
      customerDiscountValue,
      subtotal,
      customerDiscountAmount,
      grandTotal,
    };
    await fetch(`/api/${tenant}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaved(true);
    setTimeout(() => {
      setLineItems([]);
      setCustomerId("");
      setCustomerDiscountValue(0);
      setSaved(false);
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
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((l) => {
                  const lineTotal = calcLineTotal(l.mrp, l.quantity, l.discountType, l.discountValue);
                  return (
                    <TableRow key={l.batchId}>
                      <TableCell className="font-medium">{l.itemName}</TableCell>
                      <TableCell>{l.batchNumber}</TableCell>
                      <TableCell>{format(parseISO(l.expiryDate), "dd MMM yyyy")}</TableCell>
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
                            <SelectTrigger className="w-24">
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
                            value={l.discountValue}
                            onChange={(e) => updateLineItem(l.batchId, "discountValue", Number(e.target.value))}
                            className="w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">₹{lineTotal.toFixed(2)}</TableCell>
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
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium w-24 text-right">₹{subtotal.toFixed(2)}</span>
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
                <span className="font-medium w-24 text-right">−₹{customerDiscountAmount.toFixed(2)}</span>
              </div>

              <Separator className="w-full" />
              <div className="flex gap-8 text-base font-semibold">
                <span>Grand Total</span>
                <span className="w-24 text-right">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={!customerId || lineItems.length === 0 || saved}
        className="w-full sm:w-auto"
      >
        {saved ? "Invoice Saved ✓" : "Save Invoice"}
      </Button>
    </div>
  );
}
