"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Customer } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound, Percent, IndianRupee, Plus } from "lucide-react";

const customerSchema = z.object({
  name:          z.string().min(1, "Customer name required"),
  phone:         z.string().optional(),
  email:         z.string().email("Enter a valid email").optional().or(z.literal("")),
  discountType:  z.enum(["none", "percentage", "flat"]),
  discountValue: z.number().min(0).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomersListProps {
  tenant: string;
}

export function CustomersList({ tenant }: CustomersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/customers`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => {
      const payload = {
        tenantId: tenant,
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        discount:
          data.discountType !== "none" && data.discountValue
            ? { type: data.discountType as "percentage" | "flat", value: data.discountValue }
            : undefined,
      };
      return fetch(`/api/${tenant}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", tenant] });
      setDialogOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { discountType: "none" },
  });

  const discountType = watch("discountType");

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Customers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Customer
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-3 h-auto">Customer</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-3 h-auto">Phone</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-3 h-auto">Email</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-3 h-auto">Discount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j} className="py-4"><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : customers.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                      <UserRound className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-semibold text-sm">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 text-sm text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell className="py-3.5 text-sm text-muted-foreground">{c.email ?? "—"}</TableCell>
                <TableCell className="py-3.5">
                  {c.discount ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                      c.discount.type === "percentage"
                        ? "bg-teal-50 text-teal-700 border-teal-200"
                        : "bg-violet-50 text-violet-700 border-violet-200"
                    }`}>
                      {c.discount.type === "percentage"
                        ? <Percent className="h-3 w-3" />
                        : <IndianRupee className="h-3 w-3" />
                      }
                      {c.discount.type === "percentage"
                        ? `${c.discount.value}% off`
                        : `₹${c.discount.value} flat`}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No discount</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => addMutation.mutate(v))} className="space-y-4 pt-1">
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
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
