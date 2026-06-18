/**
 * Admin tools to reconcile supplier bills with inventory batches
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, RefreshCw, PackageSearch, ListRestart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import type { ReconcileReport } from "@/lib/bill-recovery-utils";

interface MissingBillsRecoveryProps {
  tenant: string;
}

export function MissingBillsRecovery({ tenant }: MissingBillsRecoveryProps) {
  const queryClient = useQueryClient();
  const [confirmRecover, setConfirmRecover] = useState(false);
  const [confirmSync, setConfirmSync] = useState(false);

  const { data: report, isLoading, isError, error, refetch } = useQuery<ReconcileReport>({
    queryKey: ["recover-bills-analysis", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/supplier-bills/recover-from-inventory`);
      if (!res.ok) throw new Error("Failed to analyze bills");
      return res.json();
    },
    retry: 2,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recover-bills-analysis", tenant] }),
      queryClient.invalidateQueries({ queryKey: ["supplier-bills", tenant] }),
    ]);
  };

  const recoverMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${tenant}/supplier-bills/recover-from-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recover-missing" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to recover bills");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      toast.success(`Recovered ${data.recovered.length} missing bill(s)`);
      await invalidate();
    },
    onError: (err: Error) => {
      toast.error("Failed to recover bills", { description: err.message });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${tenant}/supplier-bills/recover-from-inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-incomplete" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = (err as { details?: string; failures?: { error: string }[] }).details
          ?? (err as { failures?: { error: string }[] }).failures?.[0]?.error
          ?? (err as { error?: string }).error
          ?? "Failed to sync bills";
        throw new Error(detail);
      }
      return res.json();
    },
    onSuccess: async (data) => {
      if (!data.success) {
        toast.error("Sync failed", { description: data.error });
        return;
      }
      const summary = data.synced
        ?.map((s: { invoiceNumber: string; itemsBefore: number; itemsAfter: number }) =>
          `${s.invoiceNumber}: ${s.itemsBefore} → ${s.itemsAfter} items`
        )
        .join(", ");
      toast.success(`Synced ${data.synced?.length ?? 0} bill(s)`, {
        description: summary || "Line items rebuilt from inventory.",
      });
      if (data.failures?.length) {
        toast.error(`${data.failures.length} bill(s) failed to sync`, {
          description: data.failures[0]?.error,
        });
      }
      await invalidate();
    },
    onError: (err: Error) => {
      toast.error("Failed to sync bills", { description: err.message });
    },
    onSettled: async () => {
      await invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-800">{error?.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const { recovery, sync } = report;
  const hasOrphans = recovery.orphanGroups > 0;
  const hasIncomplete = sync.incompleteBills > 0;

  return (
    <div className="space-y-6">
      {/* Sync incomplete bills — most likely fix for Med24 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListRestart className="h-4 w-4" />
            Sync Bill Items from Inventory
          </CardTitle>
          <CardDescription>
            Rebuild line items on existing bills from inventory batches (fixes bills showing only 1 item after a merge)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Bills Checked</p>
              <p className="text-2xl font-bold">{sync.totalBills}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incomplete Bills</p>
              <p className="text-2xl font-bold text-amber-600">{sync.incompleteBills}</p>
            </div>
          </div>

          {!hasIncomplete ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-green-900">
                  All bills match their inventory batches.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4 flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-900">
                    <strong>{sync.incompleteBills}</strong> bill(s) have fewer items than matching inventory batches.
                    This often happens when duplicate bills were merged — stock was kept but line items were dropped.
                  </p>
                </CardContent>
              </Card>

              <Button onClick={() => setConfirmSync(true)} disabled={syncMutation.isPending}>
                {syncMutation.isPending
                  ? "Syncing..."
                  : `Sync ${sync.incompleteBills} Bill(s) from Inventory`}
              </Button>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Bill Items</TableHead>
                      <TableHead>Inventory Batches</TableHead>
                      <TableHead>Expected Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sync.bills.map((bill) => (
                      <TableRow key={bill.billId}>
                        <TableCell className="font-mono text-sm">{bill.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">{bill.supplierName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-red-700 border-red-200">
                            {bill.billItemCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{bill.inventoryBatchCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">{bill.expectedItemCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recover fully missing bills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageSearch className="h-4 w-4" />
            Recover Missing Bills
          </CardTitle>
          <CardDescription>
            Create new bills for inventory batches that have no purchase record at all
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Inventory Batches</p>
              <p className="text-2xl font-bold">{recovery.totalBatches}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Missing Bill Groups</p>
              <p className="text-2xl font-bold text-amber-600">{recovery.orphanGroups}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Batches Without Bill</p>
              <p className="text-2xl font-bold text-blue-600">{recovery.batchesWithoutBill}</p>
            </div>
          </div>

          {!hasOrphans ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-green-900">
                  Every inventory batch has a matching supplier bill.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setConfirmRecover(true)} disabled={recoverMutation.isPending}>
              {recoverMutation.isPending
                ? "Recovering..."
                : `Recover ${recovery.orphanGroups} Missing Bill(s)`}
            </Button>
          )}

          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Analysis
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmSync} onOpenChange={setConfirmSync}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Bill Items from Inventory?</DialogTitle>
            <DialogDescription>
              This will rebuild line items on {sync.incompleteBills} bill(s) using matching inventory batch records.
              Bill totals will be recalculated. Payment amounts are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSync(false)} disabled={syncMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                syncMutation.mutate();
                setConfirmSync(false);
              }}
              disabled={syncMutation.isPending}
            >
              Confirm Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRecover} onOpenChange={setConfirmRecover}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recover Missing Bills?</DialogTitle>
            <DialogDescription>
              This will create {recovery.orphanGroups} new supplier bill(s) from inventory records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRecover(false)} disabled={recoverMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                recoverMutation.mutate();
                setConfirmRecover(false);
              }}
              disabled={recoverMutation.isPending}
            >
              Confirm Recovery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
