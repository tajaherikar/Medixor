"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Supplier } from "@/lib/types";
import { useAuthStore } from "@/lib/stores";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const itemSchema = z.object({
  itemName:      z.string().min(1, "Item name required"),
  batchNumber:   z.string().min(1, "Batch number required"),
  expiryDate:    z
    .string()
    .min(1, "Expiry date required")
    .refine((val) => new Date(val) > new Date(), { message: "Expiry date must be in the future" }),
  mrp:           z.number({ error: "MRP must be > 0" }).positive("MRP must be > 0"),
  purchasePrice: z.number({ error: "Purchase price must be > 0" }).positive("Purchase price must be > 0"),
  quantity:      z.number({ error: "Quantity must be > 0" }).int().positive("Quantity must be > 0"),
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
  batchNumber: "",
  expiryDate: "",
  mrp: 0,
  purchasePrice: 0,
  quantity: 0,
};

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

  async function onSubmit(data: BillFormValues) {
    const supplier = suppliers.find((s) => s.id === data.supplierId);
    const payload = {
      ...data,
      supplierName: supplier?.name ?? "",
      tenantId: tenant,
      createdAt: new Date().toISOString(),
    };
    // In production this would POST to /api/[tenant]/supplier-bills
    console.log("Supplier bill submitted:", payload);
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
          {fields.map((field, index) => (
            <div key={field.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Item Name</Label>
                  <Input placeholder="Paracetamol 500mg" {...register(`items.${index}.itemName`)} />
                  {errors.items?.[index]?.itemName && <p className="text-xs text-destructive">{errors.items[index]!.itemName!.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Batch Number</Label>
                  <Input placeholder="PCM-2025-A" {...register(`items.${index}.batchNumber`)} />
                  {errors.items?.[index]?.batchNumber && <p className="text-xs text-destructive">{errors.items[index]!.batchNumber!.message}</p>}
                </div>
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
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="100" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {errors.items?.[index]?.quantity && <p className="text-xs text-destructive">{errors.items[index]!.quantity!.message}</p>}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || submitted || !isAdmin} className="w-full sm:w-auto"
        title={!isAdmin ? "Admin access required" : undefined}>
        {submitted ? "Bill Saved ✓" : isSubmitting ? "Saving..." : "Save Supplier Bill"}
      </Button>
    </form>
  );
}
