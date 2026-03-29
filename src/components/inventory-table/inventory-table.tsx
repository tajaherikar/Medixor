"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpiryBadge, StatusBadge } from "@/components/ui/expiry-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Batch } from "@/lib/types";
import { Search, ArrowUpDown, Package2 } from "lucide-react";

const columns: ColumnDef<Batch>[] = [
  {
    accessorKey: "itemName",
    header: "Item Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0">
          <Package2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">{row.original.itemName}</p>
          <p className="text-xs text-muted-foreground leading-tight">{row.original.supplierName}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "batchNumber",
    header: "Batch No.",
    cell: ({ row }) => (
      <span className="font-mono text-xs px-2 py-1 bg-muted rounded-md text-foreground">
        {row.original.batchNumber}
      </span>
    ),
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry Date",
    cell: ({ row }) => <ExpiryBadge expiryDate={row.original.expiryDate} />,
  },
  {
    accessorKey: "mrp",
    header: "MRP",
    cell: ({ row }) => (
      <span className="font-semibold text-sm">₹{row.original.mrp.toFixed(2)}</span>
    ),
  },
  {
    accessorKey: "availableQty",
    header: "Qty Available",
    cell: ({ row }) => {
      const qty = row.original.availableQty;
      return (
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold tabular-nums ${
              qty === 0
                ? "text-muted-foreground"
                : qty < 20
                ? "text-amber-600"
                : "text-foreground"
            }`}
          >
            {qty}
          </span>
          {qty < 20 && qty > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-200">
              Low
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

interface InventoryTableProps {
  tenant: string;
}

export function InventoryTable({ tenant }: InventoryTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);

  const { data: batches = [], isLoading } = useQuery<Batch[]>({
    queryKey: ["inventory", tenant, statusFilter, search],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/inventory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
  });

  const table = useReactTable({
    data: batches,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search item, batch, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />Active</span>
            </SelectItem>
            <SelectItem value="near_expiry">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Near Expiry</span>
            </SelectItem>
            <SelectItem value="expired">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Expired</span>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto flex items-center text-sm text-muted-foreground">
          {!isLoading && (
            <span>{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none font-semibold text-xs uppercase tracking-wide text-muted-foreground py-3 h-auto"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-16">
                  <Package2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No inventory records found</p>
                  <p className="text-xs mt-1">Try adjusting your search or filter</p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
