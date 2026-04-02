// Sync types and interfaces
export interface SyncChange {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, any>;
  timestamp: number;
  version: number;
}

export interface SyncQueue {
  changes: SyncChange[];
  lastSyncedAt: string | null;
}

export interface SyncConflict {
  id: string;
  table: string;
  field: string;
  localValue: any;
  remoteValue: any;
  localVersion: number;
  remoteVersion: number;
}

export interface SyncResult {
  success: boolean;
  pushedAt: string;
  pulledAt: string;
  changesPushed: number;
  changesPulled: number;
  conflicts: SyncConflict[];
  error?: string;
}

export interface LocalDataState {
  data: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  version: number;
}
