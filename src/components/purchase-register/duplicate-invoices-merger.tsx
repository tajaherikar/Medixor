/**
 * Admin component for detecting and merging duplicate invoices
 */

"use client";

import React, { useState } from "react";
import { useMergeDuplicateInvoices } from "@/hooks/useMergeDuplicateInvoices";
import { duplicateGroupKey } from "@/lib/invoice-merge-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Zap, RefreshCw, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DuplicateInvoicesMergerProps {
  tenant: string;
}

export function DuplicateInvoicesMerger({ tenant }: DuplicateInvoicesMergerProps) {
  const {
    report,
    isLoading,
    isError,
    error,
    refetch,
    mergeGroup,
    mergeGroupLoading,
    mergeAll,
    mergeAllLoading,
  } = useMergeDuplicateInvoices(tenant);

  const [confirmMergeAll, setConfirmMergeAll] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [confirmMergeGroup, setConfirmMergeGroup] = useState(false);

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
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Analysis</h3>
              <p className="text-sm text-red-800 mt-1">{error?.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const hasDuplicates = report.duplicateGroupsFound > 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasDuplicates ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            Duplicate Invoice Analysis
          </CardTitle>
          <CardDescription>
            Check for multiple bills with the same invoice number, supplier, and date
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Bills</p>
              <p className="text-2xl font-bold">{report.totalBills}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Duplicate Groups</p>
              <p className="text-2xl font-bold text-amber-600">{report.duplicateGroupsFound}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Bills to Consolidate</p>
              <p className="text-2xl font-bold text-blue-600">{report.billsToMerge}</p>
            </div>
          </div>

          {hasDuplicates && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-900">
                    Found <strong>{report.duplicateGroupsFound}</strong> duplicate invoice groups that can be consolidated.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!hasDuplicates && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-900">
                    ✅ No duplicate invoices found. Your data is clean!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {hasDuplicates && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setConfirmMergeAll(true)}
                disabled={mergeAllLoading}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {mergeAllLoading ? "Merging..." : `Merge All ${report.duplicateGroupsFound} Groups`}
              </Button>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Groups Table */}
      {hasDuplicates && report.groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duplicate Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Bills</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.groups.map((group, idx) => {
                    const groupKey = duplicateGroupKey(
                      group.invoiceNumber,
                      group.supplierId,
                      group.date
                    );
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono font-medium text-sm">
                          {group.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm">{group.supplierName}</TableCell>
                        <TableCell className="text-sm">{group.date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {group.billCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{group.totalItems}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedGroup(groupKey);
                              setConfirmMergeGroup(true);
                            }}
                            disabled={mergeGroupLoading}
                          >
                            Merge
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Merge All Dialog */}
      <Dialog open={confirmMergeAll} onOpenChange={setConfirmMergeAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge All Duplicate Invoices?</DialogTitle>
            <DialogDescription>
              This will consolidate {report.duplicateGroupsFound} duplicate groups and {report.billsToMerge} bills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">⚠️ This action cannot be undone</p>
                    <p className="text-xs text-amber-800 mt-1">
                      Bills will be merged by keeping the oldest invoice and combining all items.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmMergeAll(false)}
              disabled={mergeAllLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                mergeAll();
                setConfirmMergeAll(false);
              }}
              disabled={mergeAllLoading}
            >
              {mergeAllLoading ? "Merging..." : "Confirm Merge All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Merge Group Dialog */}
      {selectedGroup && (
        <Dialog open={confirmMergeGroup} onOpenChange={setConfirmMergeGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge This Invoice Group?</DialogTitle>
              <DialogDescription>
                This will consolidate the bills for invoice {selectedGroup.split("::")[0]}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-blue-900">
                    {report.groups.find((g) => duplicateGroupKey(g.invoiceNumber, g.supplierId, g.date) === selectedGroup)?.billCount} bills
                    {" "} will be merged into one
                  </p>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmMergeGroup(false)}
                disabled={mergeGroupLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  mergeGroup(selectedGroup);
                  setConfirmMergeGroup(false);
                  setSelectedGroup(null);
                }}
                disabled={mergeGroupLoading}
              >
                {mergeGroupLoading ? "Merging..." : "Confirm Merge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
