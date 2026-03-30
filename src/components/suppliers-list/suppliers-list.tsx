"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Building2, Phone, Mail, Trash2 } from "lucide-react";
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
  name:  z.string().min(1, "Supplier name required"),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SuppliersListProps {
  tenant: string;
}

export function SuppliersList({ tenant }: SuppliersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema) });

  function onSubmit(values: SupplierFormValues) {
    addMutation.mutate(values);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
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
                          {/* Show phone inline on mobile */}
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
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">Supplier Name *</Label>
              <Input id="sup-name" placeholder="e.g. MedLine Distributors" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input id="sup-phone" placeholder="e.g. 9876543210" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-email">Email</Label>
              <Input id="sup-email" type="email" placeholder="e.g. orders@supplier.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
