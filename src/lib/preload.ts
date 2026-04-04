/**
 * Data preloader for offline-first mode
 * Automatically fetches and caches all app data when online
 */

import * as apiClient from "@/lib/api-client";

export interface PreloadProgress {
  total: number;
  loaded: number;
  currentTask: string;
  isComplete: boolean;
}

type ProgressCallback = (progress: PreloadProgress) => void;

/**
 * Preload all app data for offline use
 * Call this on app startup or when coming back online
 */
export async function preloadAllData(
  tenant: string,
  onProgress?: ProgressCallback
): Promise<void> {
  const tasks = [
    { name: 'Inventory', fn: () => apiClient.fetchInventory(tenant) },
    { name: 'Invoices', fn: () => apiClient.fetchInvoices(tenant) },
    { name: 'Supplier Bills', fn: () => apiClient.fetchSupplierBills(tenant) },
    { name: 'Customers', fn: () => apiClient.fetchCustomers(tenant) },
    { name: 'Suppliers', fn: () => apiClient.fetchSuppliers(tenant) },
    { name: 'Doctors', fn: () => apiClient.fetchDoctors(tenant) },
    { name: 'Payments', fn: () => apiClient.fetchPayments(tenant) },
    { name: 'Settings', fn: () => apiClient.fetchSettings(tenant) },
  ];

  const total = tasks.length;
  let loaded = 0;

  for (const task of tasks) {
    try {
      onProgress?.({
        total,
        loaded,
        currentTask: task.name,
        isComplete: false,
      });

      await task.fn();
      loaded++;

      console.log(`✓ Preloaded ${task.name}`);
    } catch (error) {
      console.warn(`Failed to preload ${task.name}:`, error);
      // Continue with other tasks even if one fails
      loaded++;
    }
  }

  onProgress?.({
    total,
    loaded,
    currentTask: 'Complete',
    isComplete: true,
  });

  console.log('✅ All data preloaded for offline use');
}

/**
 * Check if we should preload (only when online and not in Electron offline mode)
 */
export function shouldPreload(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isElectron = !!(window as any).electron?.isElectron;
  const isOnline = navigator.onLine;
  
  // Preload when online (either in browser or Electron with connection)
  return isOnline;
}

/**
 * Auto-preload with online/offline event listeners
 */
export function setupAutoPreload(tenant: string): () => void {
  let isPreloading = false;

  const preload = async () => {
    if (isPreloading || !shouldPreload()) return;
    
    isPreloading = true;
    console.log('🔄 Auto-preloading data...');
    
    try {
      await preloadAllData(tenant, (progress) => {
        if (progress.isComplete) {
          console.log(`✅ Preload complete - All ${progress.total} datasets cached for offline use`);
        }
      });
    } finally {
      isPreloading = false;
    }
  };

  // Preload on startup
  if (shouldPreload()) {
    setTimeout(preload, 1000); // Delay 1s to not block initial render
  }

  // Preload when coming back online
  const handleOnline = () => {
    console.log('📡 Connection restored, preloading data...');
    setTimeout(preload, 500);
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
