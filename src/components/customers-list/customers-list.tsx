"use client";

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
import { UserRound, Percent, IndianRupee } from "lucide-react";

interface CustomersListProps {
  tenant: string;
}

export function CustomersList({ tenant }: CustomersListProps) {
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["customers", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/customers`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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
  );
}

