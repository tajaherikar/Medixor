// Local data layer - abstracts SQLite operations
import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import type { SyncChange } from "@/lib/sync-types";

interface UseLocalDataOptions {
  table: string;
  tenantId: string;
  autoSync?: boolean;
}

export function useLocalData<T extends Record<string, any>>({
  table,
  tenantId,
  autoSync = true,
}: UseLocalDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch from local database
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("get_local_data", {
        table,
      });
      setData(JSON.parse(result || "[]"));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [table]);

  // Save to local database + queue for sync
  const saveItem = useCallback(
    async (item: T, operation: "insert" | "update" | "delete" = "insert") => {
      try {
        await invoke("save_local_data", {
          table,
          data: JSON.stringify(item),
          operation,
        });

        // Update local state
        if (operation === "insert") {
          setData((prev) => [...prev, item]);
        } else if (operation === "update") {
          setData((prev) =>
            prev.map((i) => (i.id === item.id ? item : i))
          );
        } else if (operation === "delete") {
          setData((prev) => prev.filter((i) => i.id !== item.id));
        }

        return true;
      } catch (err) {
        setError((err as Error).message);
        return false;
      }
    },
    [table]
  );

  // Batch operations
  const saveItems = useCallback(
    async (items: T[], operation: "insert" | "update" | "delete" = "insert") => {
      const results = await Promise.all(
        items.map((item) => saveItem(item, operation))
      );
      return results.every((r) => r);
    },
    [saveItem]
  );

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [table, loadData]);

  return {
    data,
    isLoading,
    error,
    saveItem,
    saveItems,
    reload: loadData,
  };
}
