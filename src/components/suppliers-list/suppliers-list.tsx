"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Building2, Phone, Mail, Pencil, FileDigit, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { Supplier } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const supplierSchema = z.object({
  name:          z.string().min(1, "Supplier name required"),
  phone:         z.string().optional(),
  email:         z.string().email("Enter a valid email").optional().or(z.literal("")),
  address:       z.string().optional(),
  gstNumber:     z.string().optional(),
  licenseNumber: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SuppliersListProps {
  tenant: string;
}

export function SuppliersList({ tenant }: SuppliersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", tenant],
    queryFn: () => fetch(`/api/${tenant}/suppliers`).then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: SupplierFormValues) =>
      fetch(`/api/${tenant}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", tenant] });
      setDialogOpen(false);
      reset();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: SupplierFormValues) =>
      fetch(`/api/${tenant}/suppliers/${editingSupplier!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          gstNumber: data.gstNumber || null,
          licenseNumber: data.licenseNumber || null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", tenant] });
      setDialogOpen(false);
      setEditingSupplier(null);
      reset();
    },
  });

  function openEdit(s: Supplier) {
    setEditingSupplier(s);
    reset({
      name: s.name,
      phone: s.phone ?? "",
      email: s.email ?? "",
      address: s.address ?? "",
      gstNumber: s.gstNumber ?? "",
      licenseNumber: s.licenseNumber ?? "",
    });
    setDialogOpen(true);
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema) });

  function onSubmit(values: SupplierFormValues) {
    if (editingSupplier) {
      editMutation.mutate(values);
    } else {
      addMutation.mutate(values);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Supplier Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Supplier
            </Button>
          )}
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                Supplier
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                Phone
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                Email
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                GST No.
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                License No.
              </TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : suppliers.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm">{s.name}</span>
                          {s.phone && (
                            <p className="text-xs text-muted-foreground sm:hidden flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{s.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {s.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {s.phone}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {s.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {s.email}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {s.gstNumber ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <FileDigit className="h-3.5 w-3.5 shrink-0" />
                          {s.gstNumber}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                      {s.licenseNumber ? (
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                          <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                          {s.licenseNumber}
                        </span>
                      ) : "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="w-10 text-right pr-4">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Edit supplier"
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

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditingSupplier(null); reset(); } setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">Supplier Name *</Label>
              <Input id="sup-name" placeholder="e.g. MedLine Distributors" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-phone">Phone</Label>
                <Input id="sup-phone" placeholder="e.g. 9876543210" {...register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-email">Email</Label>
                <Input id="sup-email" type="email" placeholder="e.g. orders@supplier.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sup-gst">GST Number</Label>
                <Input id="sup-gst" placeholder="e.g. 27AAPFU0939F1ZV" className="font-mono text-sm" {...register("gstNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sup-license">License Number</Label>
                <Input id="sup-license" placeholder="e.g. MH-MUM-D1-12345" className="font-mono text-sm" {...register("licenseNumber")} />
              </div>
            </div>            <div className="space-y-1.5">
              <Label htmlFor="sup-address">Address <span className="text-muted-foreground">(optional)</span></Label>
              <textarea
                id="sup-address"
                rows={2}
                placeholder="Street, City, State, PIN"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                {...register("address")}
              />
            </div>            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditingSupplier(null); setDialogOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
                {(addMutation.isPending || editMutation.isPending) ? "Saving…" : editingSupplier ? "Save Changes" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
