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
import { UserRound, Percent, IndianRupee, Plus, Pencil, FileDigit, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/lib/stores";

const customerSchema = z.object({
  name:            z.string().min(1, "Customer name required"),
  phone:           z.string().optional(),
  email:           z.string().email("Enter a valid email").optional().or(z.literal("")),
  address:         z.string().optional(),
  gstNumber:       z.string().optional(),
  licenseNumber:   z.string().optional(),
  discountType:    z.enum(["none", "percentage", "flat"]),
  discountValue:   z.number().min(0).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomersListProps {
  tenant: string;
}

export function CustomersList({ tenant }: CustomersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", tenant, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/${tenant}/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const addMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => {
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

  const editMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => {
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
      return fetch(`/api/${tenant}/customers/${editingCustomer!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", tenant] });
      setDialogOpen(false);
      setEditingCustomer(null);
      reset();
    },
  });

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    reset({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      gstNumber: c.gstNumber ?? "",
      licenseNumber: c.licenseNumber ?? "",
      discountType: c.discount?.type ?? "none",
      discountValue: c.discount?.value ?? undefined,
    });
    setDialogOpen(true);
  }

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
        <div className="space-y-4 px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Customers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {customers.length} customer{customers.length !== 1 ? "s" : ""} registered
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Customer
              </Button>
            )}
          </div>
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Phone</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">GST No.</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">License No.</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Discount</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : customers.map((c) => (
              <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                      <UserRound className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{c.name}</span>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{c.phone}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{c.phone ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{c.email ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {c.gstNumber ? (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <FileDigit className="h-3 w-3 text-muted-foreground" />{c.gstNumber}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {c.licenseNumber ? (
                    <span className="flex items-center gap-1.5 text-xs font-mono">
                      <BadgeCheck className="h-3 w-3 text-muted-foreground" />{c.licenseNumber}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
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
                {isAdmin && (
                  <TableCell className="w-10 text-right pr-4">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Edit customer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditingCustomer(null); reset(); } setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => editingCustomer ? editMutation.mutate(v) : addMutation.mutate(v))} className="space-y-4 pt-1">
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
              <Button type="button" variant="outline" onClick={() => { setEditingCustomer(null); setDialogOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
                {(addMutation.isPending || editMutation.isPending) ? "Saving…" : editingCustomer ? "Save Changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
