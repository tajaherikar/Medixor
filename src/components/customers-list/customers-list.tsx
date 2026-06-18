"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRound, Percent, IndianRupee, Plus, Pencil, FileDigit, BadgeCheck } from "lucide-react";
import { useAuthStore } from "@/lib/stores";
import { CustomerDialog } from "@/components/customers-list/customer-dialog";

interface CustomersListProps {
  tenant: string;
}

export function CustomersList({ tenant }: CustomersListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
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

  function openEdit(c: Customer) {
    setEditingCustomer(c);
    setDialogOpen(true);
  }

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

      <CustomerDialog
        tenant={tenant}
        open={dialogOpen}
        customer={editingCustomer}
        onOpenChange={(open) => {
          if (!open) setEditingCustomer(null);
          setDialogOpen(open);
        }}
      />
    </>
  );
}
