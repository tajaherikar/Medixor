"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Supplier, GstRate, UnitType } from "@/lib/types";
import { useAuthStore } from "@/lib/stores";

const GST_RATES: GstRate[] = [0, 5, 12, 18, 28];

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemName:      z.string().min(1, "Item name required"),
  hsnCode:       z.string().optional(),
  batchNumber:   z.string().min(1, "Batch number required"),
  expiryDate:    z
    .string()
    .min(1, "Expiry date required")
    .refine((val) => new Date(val) > new Date(), { message: "Expiry date must be in the future" }),
  mrp:           z.number({ error: "MRP must be > 0" }).positive("MRP must be > 0"),
  purchasePrice: z.number({ error: "Purchase price must be > 0" }).positive("Purchase price must be > 0"),
  quantity:      z.number({ error: "Quantity must be > 0" }).int().positive("Quantity must be > 0"),
  gstRate:       z.number(),
  gstInclusive:  z.boolean().optional(),
  unitType:      z.string().optional(),
  packSize:      z.number().int().positive().optional(),
});

const billSchema = z.object({
  supplierId:    z.string().min(1, "Select a supplier"),
  invoiceNumber: z.string().min(1, "Invoice number required"),
  date:          z.string().min(1, "Date required"),
  items:         z.array(itemSchema).min(1, "Add at least one item"),
});

type BillFormValues = z.infer<typeof billSchema>;

const emptyItem = {
  itemName: "",
  hsnCode: "",
  batchNumber: "",
  expiryDate: "",
  mrp: 0,
  purchasePrice: 0,
  quantity: 0,
  gstRate: 12,
  gstInclusive: false,
  unitType: "",
  packSize: undefined as number | undefined,
};

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

interface SupplierBillFormProps {
  tenant: string;
  onSuccess?: () => void;
}

export function SupplierBillForm({ tenant, onSuccess }: SupplierBillFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/suppliers`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      supplierId: "",
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      items: [emptyItem],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const watchedSupplierId = useWatch({ control, name: "supplierId" });
  const selectedSupplier = suppliers.find((s) => s.id === watchedSupplierId);

  // Live totals
  const itemTotals = (watchedItems ?? []).map((item) => {
    const qty = item.quantity || 0;
    const price = item.purchasePrice || 0;
    const rate = (item.gstRate || 0) / 100;
    const gross = price * qty;

    if (item.gstInclusive) {
      const taxable = rate > 0 ? gross / (1 + rate) : gross;
      const gst = gross - taxable;
      return { taxable, cgst: gst / 2, sgst: gst / 2, lineTotal: gross };
    }

    const taxable = gross;
    const gst = taxable * rate;
    return { taxable, cgst: gst / 2, sgst: gst / 2, lineTotal: taxable + gst };
  });
  const billTaxable = itemTotals.reduce((s, i) => s + i.taxable, 0);
  const billGst = itemTotals.reduce((s, i) => s + i.cgst + i.sgst, 0);
  const billTotal = billTaxable + billGst;

  async function onSubmit(data: BillFormValues) {
    const supplier = suppliers.find((s) => s.id === data.supplierId);

    const enrichedItems = data.items.map((item) => {
      const qty = item.quantity;
      const price = item.purchasePrice;
      const rate = item.gstRate / 100;
      const gross = price * qty;

      let taxableAmount: number;
      let gstAmount: number;
      let lineTotal: number;

      if (item.gstInclusive) {
        taxableAmount = rate > 0 ? gross / (1 + rate) : gross;
        gstAmount = gross - taxableAmount;
        lineTotal = gross;
      } else {
        taxableAmount = gross;
        gstAmount = taxableAmount * rate;
        lineTotal = taxableAmount + gstAmount;
      }

      return {
        ...item,
        hsnCode: item.hsnCode ?? "",
        taxableAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        lineTotal,
      };
    });

    const taxableAmount = enrichedItems.reduce((s, i) => s + i.taxableAmount, 0);
    const totalGst = enrichedItems.reduce((s, i) => s + i.cgst + i.sgst, 0);

    const payload = {
      ...data,
      items: enrichedItems,
      supplierName: supplier?.name ?? "",
      ...(supplier?.gstNumber && { supplierGstNumber: supplier.gstNumber }),
      ...(supplier?.licenseNumber && { supplierLicenseNumber: supplier.licenseNumber }),
      ...(supplier?.address && { supplierAddress: supplier.address }),
      tenantId: tenant,
      taxableAmount,
      totalGst,
      grandTotal: taxableAmount + totalGst,
      paymentStatus: "pending",
      paidAmount: 0,
      createdAt: new Date().toISOString(),
    };
    const res = await fetch(`/api/${tenant}/supplier-bills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = typeof err.error === "string" ? err.error : (err.message ?? res.statusText);
      alert(`Failed to save bill: ${msg}`);
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      reset();
      setSubmitted(false);
      onSuccess?.();
    }, 1500);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier Details</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
          {/* Supplier */}
          <div className="space-y-1">
            <Label>Supplier</Label>
            <Select onValueChange={(v) => setValue("supplierId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
            {selectedSupplier && (selectedSupplier.gstNumber || selectedSupplier.licenseNumber || selectedSupplier.address) && (
              <div className="flex flex-wrap gap-3 mt-1">
                {selectedSupplier.gstNumber && (
                  <span className="text-xs text-muted-foreground">
                    GST: <span className="font-mono font-medium text-foreground">{selectedSupplier.gstNumber}</span>
                  </span>
                )}
                {selectedSupplier.licenseNumber && (
                  <span className="text-xs text-muted-foreground">
                    License: <span className="font-mono font-medium text-foreground">{selectedSupplier.licenseNumber}</span>
                  </span>
                )}
                {selectedSupplier.address && (
                  <span className="text-xs text-muted-foreground">{selectedSupplier.address}</span>
                )}
              </div>
            )}
          </div>

          {/* Invoice Number */}
          <div className="space-y-1">
            <Label>Invoice Number</Label>
            <Input placeholder="INV-001" {...register("invoiceNumber")} />
            {errors.invoiceNumber && <p className="text-xs text-destructive">{errors.invoiceNumber.message}</p>}
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" {...register("date")} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => append(emptyItem)}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const t = itemTotals[index];
            return (
              <div key={field.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="grid sm:grid-cols-3 gap-3">
                  {/* Row 1 */}
                  <div className="space-y-1">
                    <Label>Item Name</Label>
                    <Input placeholder="Paracetamol 500mg" {...register(`items.${index}.itemName`)} />
                    {errors.items?.[index]?.itemName && <p className="text-xs text-destructive">{errors.items[index]!.itemName!.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>HSN Code <span className="text-muted-foreground">(optional)</span></Label>
                    <Input placeholder="30049099" {...register(`items.${index}.hsnCode`)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Batch Number</Label>
                    <Input placeholder="PCM-2025-A" {...register(`items.${index}.batchNumber`)} />
                    {errors.items?.[index]?.batchNumber && <p className="text-xs text-destructive">{errors.items[index]!.batchNumber!.message}</p>}
                  </div>

                  {/* Row 2 */}
                  <div className="space-y-1">
                    <Label>Expiry Date</Label>
                    <Input type="date" {...register(`items.${index}.expiryDate`)} />
                    {errors.items?.[index]?.expiryDate && <p className="text-xs text-destructive">{errors.items[index]!.expiryDate!.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>MRP (₹)</Label>
                    <Input type="number" step="0.01" placeholder="25.00" {...register(`items.${index}.mrp`, { valueAsNumber: true })} />
                    {errors.items?.[index]?.mrp && <p className="text-xs text-destructive">{errors.items[index]!.mrp!.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Purchase Price (₹)</Label>
                    <Input type="number" step="0.01" placeholder="18.00" {...register(`items.${index}.purchasePrice`, { valueAsNumber: true })} />
                    {errors.items?.[index]?.purchasePrice && <p className="text-xs text-destructive">{errors.items[index]!.purchasePrice!.message}</p>}
                  </div>

                  {/* Row 3 — Unit + Pack Size + Quantity + GST */}
                  <div className="space-y-1">
                    <Label>Unit Type <span className="text-muted-foreground">(optional)</span></Label>
                    <Select
                      value={emptyItem.unitType}
                      onValueChange={(v) => setValue(`items.${index}.unitType`, v as UnitType)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="e.g. Tab" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Solid / Oral Solid</SelectLabel>
                          <SelectItem value="Tab">Tab — Tablet</SelectItem>
                          <SelectItem value="Cap">Cap — Capsule</SelectItem>
                          <SelectItem value="SR Tab">SR Tab — Sustained Release</SelectItem>
                          <SelectItem value="ER Tab">ER Tab — Extended Release</SelectItem>
                          <SelectItem value="XR Tab">XR Tab — Extended Release (XR)</SelectItem>
                          <SelectItem value="CR Tab">CR Tab — Controlled Release</SelectItem>
                          <SelectItem value="EC Tab">EC Tab — Enteric Coated</SelectItem>
                          <SelectItem value="DT">DT — Dispersible Tablet</SelectItem>
                          <SelectItem value="MD Tab">MD Tab — Mouth Dissolving</SelectItem>
                          <SelectItem value="Chew Tab">Chew Tab — Chewable</SelectItem>
                          <SelectItem value="Eff Tab">Eff Tab — Effervescent</SelectItem>
                          <SelectItem value="SL Tab">SL Tab — Sub-Lingual</SelectItem>
                          <SelectItem value="SF Tab">SF Tab — Sugar Free</SelectItem>
                          <SelectItem value="Loz">Loz — Lozenge</SelectItem>
                          <SelectItem value="Gran">Gran — Granules</SelectItem>
                          <SelectItem value="Pellets">Pellets — Sprinkles</SelectItem>
                          <SelectItem value="Sachet">Sachet</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Liquid</SelectLabel>
                          <SelectItem value="Syp">Syp — Syrup</SelectItem>
                          <SelectItem value="Susp">Susp — Suspension</SelectItem>
                          <SelectItem value="Sol">Sol — Solution</SelectItem>
                          <SelectItem value="Drops">Drops — Oral Drops</SelectItem>
                          <SelectItem value="Eye Drops">Eye Drops</SelectItem>
                          <SelectItem value="Ear Drops">Ear Drops</SelectItem>
                          <SelectItem value="Nasal Drops">Nasal Drops</SelectItem>
                          <SelectItem value="Nasal Spray">Nasal Spray</SelectItem>
                          <SelectItem value="Mouth Wash">Mouth Wash</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Injectable</SelectLabel>
                          <SelectItem value="Inj">Inj — Injection</SelectItem>
                          <SelectItem value="Vial">Vial</SelectItem>
                          <SelectItem value="Amp">Amp — Ampoule</SelectItem>
                          <SelectItem value="IV Inf">IV Inf — IV Infusion</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Topical / External</SelectLabel>
                          <SelectItem value="Cream">Cream</SelectItem>
                          <SelectItem value="Oint">Oint — Ointment</SelectItem>
                          <SelectItem value="Gel">Gel</SelectItem>
                          <SelectItem value="Lotion">Lotion</SelectItem>
                          <SelectItem value="Dusting Pwd">Dusting Pwd — Dusting Powder</SelectItem>
                          <SelectItem value="Spray">Spray — Topical/Throat</SelectItem>
                          <SelectItem value="Patch">Patch — Transdermal</SelectItem>
                          <SelectItem value="Shampoo">Shampoo — Medicated</SelectItem>
                          <SelectItem value="Soap">Soap — Medicated</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Respiratory</SelectLabel>
                          <SelectItem value="MDI">MDI — Metered Dose Inhaler</SelectItem>
                          <SelectItem value="Rotacap">Rotacap — Rotahaler Capsule</SelectItem>
                          <SelectItem value="Turbuhaler">Turbuhaler</SelectItem>
                          <SelectItem value="Neb Sol">Neb Sol — Nebulization Solution</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Other</SelectLabel>
                          <SelectItem value="Supp">Supp — Suppository</SelectItem>
                          <SelectItem value="Pessary">Pessary — Vaginal Pessary</SelectItem>
                          <SelectItem value="Device">Device — Medical Device</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Pack Size <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g. 10"
                      {...register(`items.${index}.packSize`, { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground">Units per strip/bottle (e.g. 10 → Tab 10)</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input type="number" placeholder="100" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                    {errors.items?.[index]?.quantity && <p className="text-xs text-destructive">{errors.items[index]!.quantity!.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>GST Rate (%)</Label>
                    <Select
                      defaultValue={String(emptyItem.gstRate)}
                      onValueChange={(v) => setValue(`items.${index}.gstRate`, Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GST_RATES.map((r) => (
                          <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(watchedItems?.[index]?.gstInclusive)}
                        onChange={(e) => setValue(`items.${index}.gstInclusive`, e.target.checked)}
                        className="h-4 w-4 rounded border border-input text-primary focus-visible:outline-none"
                      />
                      <span>Inclusive GST in line total</span>
                    </label>
                  </div>
                  <div className="space-y-1">
                    <Label>Line Total</Label>
                    <div className="flex items-center gap-2 h-10">
                      <span className="text-sm text-muted-foreground">
                        {rupees(t?.taxable ?? 0)} + GST {rupees((t?.cgst ?? 0) + (t?.sgst ?? 0))} = <strong>{rupees(t?.lineTotal ?? 0)}</strong>
                      </span>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bill Totals */}
          <Separator />
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className="w-28 text-right">{rupees(billTaxable)}</span>
            </div>
            <div className="flex gap-8">
              <span className="text-muted-foreground">Total GST (CGST + SGST)</span>
              <span className="w-28 text-right text-blue-600">{rupees(billGst)}</span>
            </div>
            <div className="flex gap-8 font-semibold text-base">
              <span>Grand Total</span>
              <span className="w-28 text-right">{rupees(billTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || submitted || !isAdmin} className="w-full sm:w-auto"
        title={!isAdmin ? "Admin access required" : undefined}>
        {submitted ? "Bill Saved ✓" : isSubmitting ? "Saving..." : "Save Supplier Bill"}
      </Button>
    </form>
  );
}
