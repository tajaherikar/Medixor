"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Customer } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name required"),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  discountType: z.enum(["none", "percentage", "flat"]),
  discountValue: z.number().min(0).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  tenant: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerDialog({
  tenant,
  open,
  onOpenChange,
  customer,
  onSaved,
}: CustomerDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(customer);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { discountType: "none" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      gstNumber: customer?.gstNumber ?? "",
      licenseNumber: customer?.licenseNumber ?? "",
      discountType: customer?.discount?.type ?? "none",
      discountValue: customer?.discount?.value ?? undefined,
    });
  }, [customer, open, reset]);

  const addMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const payload = {
        tenantId: tenant,
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        gstNumber: data.gstNumber || undefined,
        licenseNumber: data.licenseNumber || undefined,
        discount:
          data.discountType !== "none" && data.discountValue
            ? { type: data.discountType as "percentage" | "flat", value: data.discountValue }
            : undefined,
      };
      const res = await fetch(`/api/${tenant}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add customer");
      return res.json() as Promise<Customer>;
    },
    onSuccess: (savedCustomer) => {
      queryClient.setQueryData<Customer[]>(["customers", tenant], (current = []) => {
        if (current.some((c) => c.id === savedCustomer.id)) return current;
        return [...current, savedCustomer];
      });
      queryClient.invalidateQueries({ queryKey: ["customers", tenant] });
      onSaved?.(savedCustomer);
      onOpenChange(false);
      reset();
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        gstNumber: data.gstNumber || null,
        licenseNumber: data.licenseNumber || null,
        discount:
          data.discountType !== "none" && data.discountValue
            ? { type: data.discountType as "percentage" | "flat", value: data.discountValue }
            : null,
      };
      const res = await fetch(`/api/${tenant}/customers/${customer!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return res.json() as Promise<Customer>;
    },
    onSuccess: (savedCustomer) => {
      queryClient.setQueryData<Customer[]>(["customers", tenant], (current = []) =>
        current.map((c) => (c.id === savedCustomer.id ? savedCustomer : c))
      );
      queryClient.invalidateQueries({ queryKey: ["customers", tenant] });
      onSaved?.(savedCustomer);
      onOpenChange(false);
      reset();
    },
  });

  const discountType = useWatch({ control, name: "discountType" });
  const isSaving = addMutation.isPending || editMutation.isPending;

  function handleClose(openState: boolean) {
    if (!openState) reset();
    onOpenChange(openState);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            isEditing ? editMutation.mutate(values) : addMutation.mutate(values)
          )}
          className="space-y-4 pt-1"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cus-name">Customer Name *</Label>
            <Input id="cus-name" placeholder="e.g. City Pharmacy" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cus-phone">Phone</Label>
              <Input id="cus-phone" placeholder="9876543210" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cus-email">Email</Label>
              <Input id="cus-email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cus-gst">GST Number</Label>
              <Input id="cus-gst" placeholder="22AAAAA0000A1Z5" className="font-mono" {...register("gstNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cus-license">License Number</Label>
              <Input id="cus-license" placeholder="DL-MH-12345" className="font-mono" {...register("licenseNumber")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cus-address">Address <span className="text-muted-foreground">(optional)</span></Label>
            <textarea
              id="cus-address"
              rows={2}
              placeholder="Street, City, State, PIN"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              {...register("address")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Discount</Label>
            <Select
              value={discountType}
              onValueChange={(v) => setValue("discountType", v as CustomerFormValues["discountType"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="No discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="flat">Flat (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {discountType !== "none" && (
            <div className="space-y-1.5">
              <Label htmlFor="cus-discount-val">
                {discountType === "percentage" ? "Discount %" : "Flat Amount (₹)"}
              </Label>
              <Input
                id="cus-discount-val"
                type="number"
                min={0}
                placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 50"}
                {...register("discountValue", { valueAsNumber: true })}
              />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
