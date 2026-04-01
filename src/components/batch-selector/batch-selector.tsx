"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Batch, BatchSelectionStrategy, UnitType } from "@/lib/types";
import { sortByFEFO, sortByFIFO, allocateQuantity } from "@/lib/batch-logic";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiryBadge } from "@/components/ui/expiry-badge";

export interface SelectedBatchAllocation {
  batchId: string;
  batchNumber: string;
  itemName: string;
  expiryDate: string;
  mrp: number;
  qty: number;
  unitType?: UnitType;
  packSize?: number;
}

interface BatchSelectorProps {
  tenant: string;
  strategy: BatchSelectionStrategy;
  onAdd: (allocations: SelectedBatchAllocation[]) => void;
}

export function BatchSelector({ tenant, strategy, onAdd }: BatchSelectorProps) {
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [requestedQty, setRequestedQty] = useState(1);
  const [manualBatchId, setManualBatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch batches for selected item
  const { data: batches = [], isLoading } = useQuery<Batch[]>({
    queryKey: ["item-batches", tenant, selectedItem],
    queryFn: async () => {
      if (!selectedItem) return [];
      const encoded = encodeURIComponent(selectedItem);
      const res = await fetch(`/api/${tenant}/inventory/${encoded}`);
      if (!res.ok) throw new Error("Failed to fetch batches");
      return res.json();
    },
    enabled: !!selectedItem,
  });

  const sortedBatches =
    strategy === "manual"
      ? batches
      : strategy === "fefo"
      ? sortByFEFO(batches)
      : sortByFIFO(batches);

  function handleAdd() {
    setError(null);
    try {
      if (strategy === "manual") {
        const batch = batches.find((b) => b.id === manualBatchId);
        if (!batch) { setError("Select a batch first."); return; }
        if (requestedQty > batch.availableQty) {
          setError(`Only ${batch.availableQty} units available.`);
          return;
        }
        onAdd([{ batchId: batch.id, batchNumber: batch.batchNumber, itemName: batch.itemName, expiryDate: batch.expiryDate, mrp: batch.mrp, qty: requestedQty, ...(batch.unitType && { unitType: batch.unitType }), ...(batch.packSize && { packSize: batch.packSize }) }]);
      } else {
        const allocations = allocateQuantity(sortedBatches, requestedQty);
        onAdd(allocations.map((a) => ({ batchId: a.batchId, batchNumber: a.batchNumber, itemName: a.itemName, expiryDate: a.expiryDate, mrp: a.mrp, qty: a.allocatedQty, ...(a.unitType && { unitType: a.unitType }), ...(a.packSize && { packSize: a.packSize }) })));
      }
      setSelectedItem(null);
      setItemSearch("");
      setRequestedQty(1);
      setManualBatchId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  // Unique item names from all batches (for search dropdown)
  const { data: allBatches = [] } = useQuery<Batch[]>({
    queryKey: ["inventory", tenant, "all", ""],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/inventory`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const uniqueItems = Array.from(new Set(allBatches.filter((b) => b.availableQty > 0).map((b) => b.itemName)));
  const filteredItems = itemSearch
    ? uniqueItems.filter((i) => i.toLowerCase().includes(itemSearch.toLowerCase()))
    : uniqueItems;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Item to Invoice</CardTitle>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {strategy === "fefo" && "Strategy: FEFO — Batches expiring soonest will be allocated first to minimize waste."}
          {strategy === "fifo" && "Strategy: FIFO — Oldest batches will be allocated first."}
          {strategy === "manual" && "Strategy: Manual — Select specific batches for this allocation."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item Search */}
        <div className="space-y-1">
          <Label>Item Name</Label>
          <Input
            placeholder="Search item..."
            value={itemSearch}
            onChange={(e) => { setItemSearch(e.target.value); setSelectedItem(null); }}
          />
          {itemSearch && !selectedItem && filteredItems.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {filteredItems.map((item) => (
                <div
                  key={item}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => { setSelectedItem(item); setItemSearch(item); }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            value={requestedQty}
            onChange={(e) => setRequestedQty(Number(e.target.value))}
            className="w-32"
          />
        </div>

        {/* Manual batch selection */}
        {strategy === "manual" && selectedItem && sortedBatches.length > 0 && (
          <div className="space-y-2">
            <Label>Select Batch</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBatches.map((b) => (
                  <TableRow
                    key={b.id}
                    className={`cursor-pointer ${manualBatchId === b.id ? "bg-accent" : ""}`}
                    onClick={() => setManualBatchId(b.id)}
                  >
                    <TableCell>
                      <input type="radio" readOnly checked={manualBatchId === b.id} />
                    </TableCell>
                    <TableCell>{b.batchNumber}</TableCell>
                    <TableCell>{format(parseISO(b.expiryDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>₹{b.mrp}</TableCell>
                    <TableCell>{b.availableQty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Auto-selected batch preview (FEFO/FIFO) */}
        {strategy !== "manual" && selectedItem && sortedBatches.length > 0 && (
          <div className="text-sm space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">
                Batch Allocation Preview
              </p>
              <Badge variant="secondary" className="text-xs">
                {sortedBatches.length} available
              </Badge>
            </div>
            <div className="space-y-2">
              {sortedBatches.slice(0, 3).map((b, idx) => {
                // Calculate how much of requested quantity this batch will fulfill
                let allocatedQty = 0;
                let remaining = requestedQty;
                for (let i = 0; i <= idx; i++) {
                  if (i === idx) {
                    allocatedQty = Math.min(remaining, sortedBatches[i].availableQty);
                  } else {
                    remaining -= sortedBatches[i].availableQty;
                  }
                }
                return (
                  <div key={b.id} className="flex items-center gap-2 p-2 bg-accent/50 rounded-md border border-border/50">
                    <Badge variant="default" className="text-xs font-bold">
                      P{idx + 1}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                          {b.batchNumber}
                        </span>
                        <ExpiryBadge expiryDate={b.expiryDate} showRelative={true} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ₹{b.mrp} · Qty: {b.availableQty} {allocatedQty > 0 && `(${allocatedQty} will be taken)`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Loading batches...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleAdd} disabled={!selectedItem || isLoading} className="w-full sm:w-auto">
          Add to Invoice
        </Button>
      </CardContent>
    </Card>
  );
}
