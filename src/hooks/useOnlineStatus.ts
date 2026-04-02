// Hook to detect online/offline status and trigger syncs
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingChanges: number;
  syncError: string | null;
}

export function useOnlineStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof window !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingChanges: 0,
    syncError: null,
  });

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
        syncError: null,
      }));
      // Trigger sync when connection restored
      triggerSync();
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function triggerSync() {
    setStatus((prev) => ({ ...prev, isSyncing: true }));
    try {
      // Call sync engine from Tauri backend
      const result = await invoke("sync_with_server", {
        changes: JSON.stringify({}),
      });
      
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncError: (err as Error).message,
      }));
    }
  }

  return status;
}
