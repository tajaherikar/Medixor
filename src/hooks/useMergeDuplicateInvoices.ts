/**
 * Hook for managing duplicate invoice detection and merging
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MergeReport } from "@/lib/invoice-merge-utils";

export function useMergeDuplicateInvoices(tenant: string) {
  const queryClient = useQueryClient();

  // Analyze for duplicates
  const analyzeQuery = useQuery<MergeReport>({
    queryKey: ["merge-duplicates-analysis", tenant],
    queryFn: async () => {
      const res = await fetch(`/api/${tenant}/supplier-bills/merge-duplicates`);
      if (!res.ok) throw new Error("Failed to analyze duplicates");
      return res.json();
    },
    retry: 2,
  });

  // Merge specific group
  const mergeGroupMutation = useMutation({
    mutationFn: async (groupKey: string) => {
      const res = await fetch(`/api/${tenant}/supplier-bills/merge-duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge-group",
          groupKey,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Merge failed:", err);
        throw new Error(err.error || "Failed to merge group");
      }
      const data = await res.json();
      console.log("Merge successful:", data);
      return data;
    },
    onSuccess: async (data) => {
      toast.success(`Merged ${data.mergedBillIds.length} bills successfully`, {
        description: `Invoice ${data.invoiceNumber} now has ${data.itemsCount} items`,
      });
      // Invalidate and wait for refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["merge-duplicates-analysis", tenant],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills", tenant],
        }),
      ]);
    },
    onError: (error: any) => {
      console.error("Merge error:", error);
      toast.error("Failed to merge bills", {
        description: error.message,
      });
    },
  });

  // Merge all duplicates
  const mergeAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${tenant}/supplier-bills/merge-duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "merge-all",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Merge all failed:", err);
        throw new Error(err.error || "Failed to merge duplicates");
      }
      const data = await res.json();
      console.log("Merge all successful:", data);
      return data;
    },
    onSuccess: async (data) => {
      toast.success("✅ Merged all duplicate invoices", {
        description: `Consolidated ${data.billsMerged} bills across ${data.results.length} groups`,
      });
      // Invalidate and wait for refetch
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["merge-duplicates-analysis", tenant],
        }),
        queryClient.invalidateQueries({
          queryKey: ["supplier-bills", tenant],
        }),
      ]);
    },
    onError: (error: any) => {
      console.error("Merge all error:", error);
      toast.error("Failed to merge all duplicates", {
        description: error.message,
      });
    },
  });

  return {
    report: analyzeQuery.data,
    isLoading: analyzeQuery.isLoading,
    isError: analyzeQuery.isError,
    error: analyzeQuery.error,
    refetch: analyzeQuery.refetch,
    mergeGroup: mergeGroupMutation.mutate,
    mergeGroupLoading: mergeGroupMutation.isPending,
    mergeAll: mergeAllMutation.mutate,
    mergeAllLoading: mergeAllMutation.isPending,
  };
}
