"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Doctor } from "@/lib/types";
import { calculateDoctorTarget } from "@/lib/doctor-target";
import { DoctorTargetCard } from "@/components/ui/doctor-target-card";
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
import { Stethoscope, IndianRupee, Plus, Pencil } from "lucide-react";
import { useAuthStore } from "@/lib/stores";

const doctorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["doctor", "lab", "consultant"]),
  phone: z.string().optional(),
  allocatedAmount: z.number().min(0, "Allocated amount must be 0 or more"),
  targetPercentage: z.number().min(0, "Target percentage must be 0 or more").max(500, "Target percentage cannot exceed 500%"),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

interface DoctorsListProps {
  tenant: string;
}

const typeLabelMap: Record<string, string> = {
  doctor: "Doctor",
  lab: "Medical Lab",
  consultant: "Consultant",
};

const typePrefix: Record<string, string> = {
  doctor: "DR",
  lab: "Lab",
  consultant: "Consultant",
};

const typeBadge: Record<string, string> = {
  doctor: "bg-blue-100 text-blue-700",
  lab: "bg-purple-100 text-purple-700",
  consultant: "bg-teal-100 text-teal-700",
};

function rupees(n: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export function DoctorsList({ tenant }: DoctorsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ["doctors", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/doctors`);
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: DoctorFormValues) => {
      const targetAmount = calculateDoctorTarget(data.allocatedAmount, data.targetPercentage);
      const payload = {
        tenantId: tenant,
        name: data.name,
        type: data.type,
        phone: data.phone || undefined,
        allocatedAmount: data.allocatedAmount,
        targetPercentage: data.targetPercentage,
        targetAmount,
      };
      return fetch(`/api/${tenant}/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors", tenant] });
      setDialogOpen(false);
      reset();
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: DoctorFormValues) => {
      const targetAmount = calculateDoctorTarget(data.allocatedAmount, data.targetPercentage);
      const payload = {
        name: data.name,
        type: data.type,
        phone: data.phone || null,
        allocatedAmount: data.allocatedAmount,
        targetPercentage: data.targetPercentage,
        targetAmount,
      };
      return fetch(`/api/${tenant}/doctors/${editingDoctor!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors", tenant] });
      setDialogOpen(false);
      setEditingDoctor(null);
      reset();
    },
  });

  function openEdit(d: Doctor) {
    setEditingDoctor(d);
    reset({
      name: d.name,
      type: d.type,
      phone: d.phone ?? "",
      allocatedAmount: d.allocatedAmount,
      targetPercentage: d.targetPercentage,
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
  } = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { type: "doctor", allocatedAmount: 30000, targetPercentage: 30 },
  });

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm">Reference Persons</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {doctors.length} reference{doctors.length !== 1 ? "s" : ""} registered
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Reference
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Stethoscope className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No reference persons yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add doctors, labs, or consultants to track business references.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Monthly Target</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 shrink-0">
                        <Stethoscope className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>{typePrefix[doc.type] ?? doc.type} {doc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {doc.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {doc.targetAmount > 0 ? (
                      <span className="flex items-center justify-end gap-0.5 text-amber-700">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {rupees(doc.targetAmount).replace("₹", "")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="w-10 text-right pr-4">
                      <button
                        onClick={() => openEdit(doc)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Edit reference"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditingDoctor(null); reset(); } setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Edit Reference Person" : "Add Reference Person"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) => editingDoctor ? editMutation.mutate(data) : addMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Type & Name</Label>
              <div className="flex gap-3">
                <Select
                  value={watch("type")}
                  onValueChange={(v) =>
                    setValue("type", v as "doctor" | "lab" | "consultant")
                  }
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                  </SelectContent>
                </Select>
                <Input {...register("name")} placeholder="Rahul Sharma" className="flex-1" />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Phone (optional)</Label>
              <Input {...register("phone")} placeholder="+91 98765 43210" />
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="allocated">Amount You Pay (₹)</Label>
                  <Input
                    id="allocated"
                    type="number"
                    min={0}
                    step={1000}
                    {...register("allocatedAmount", { valueAsNumber: true })}
                    placeholder="e.g. 30000"
                  />
                  <p className="text-xs text-muted-foreground">Initial amount allocated to doctor</p>
                  {errors.allocatedAmount && (
                    <p className="text-xs text-destructive">{errors.allocatedAmount.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="target">Growth Target (%)</Label>
                  <Input
                    id="target"
                    type="number"
                    min={0}
                    max={500}
                    step={5}
                    {...register("targetPercentage", { valueAsNumber: true })}
                    placeholder="e.g. 30"
                  />
                  <p className="text-xs text-muted-foreground">Increase amount or % to increase target sales</p>
                  {errors.targetPercentage && (
                    <p className="text-xs text-destructive">{errors.targetPercentage.message}</p>
                  )}
                </div>
              </div>

              {/* Target Calculation Preview */}
              {(() => {
                const allocated = watch("allocatedAmount") ?? 0;
                const percentage = watch("targetPercentage") ?? 0;
                return allocated > 0 && percentage > 0 ? (
                  <div className="mt-3">
                    <DoctorTargetCard 
                      allocatedAmount={allocated} 
                      targetPercentage={percentage} 
                      compact={true}
                    />
                  </div>
                ) : null;
              })()}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setEditingDoctor(null); setDialogOpen(false); reset(); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
                {(addMutation.isPending || editMutation.isPending) ? "Saving…" : editingDoctor ? "Save Changes" : "Add Reference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
