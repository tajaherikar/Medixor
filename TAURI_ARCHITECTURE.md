# Medixor Desktop App - Tauri + SQLite Architecture

## Overview
This document describes the offline-first desktop app architecture with bidirectional sync.

## Project Structure

```
Medixor/
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs              # Entry point, Tauri commands
│   │   ├── db.rs                # SQLite database operations
│   │   └── sync_engine.rs       # Sync logic (push/pull)
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri configuration
│   └── build.rs                 # Build script
│
├── src/
│   ├── hooks/
│   │   ├── useLocalData.ts      # Local data fetching hook
│   │   └── useOnlineStatus.ts   # Online/offline detection
│   ├── lib/
│   │   └── sync-types.ts        # TypeScript interfaces
│   └── components/              # React components
│
├── package.json                  # npm scripts added
└── next.config.ts
```

## Key Features

### 1. Local SQLite Database
- Stores full copy of cloud data (customers, invoices, batches, doctors, etc.)
- Separate `sync_metadata` table tracks last sync time per table
- `sync_queue` table queues pending changes for sync

### 2. Tauri Backend (Rust)
- **Database module**: CRUD operations on SQLite
- **Sync engine**: Bidirectional sync with Supabase
- **Commands exposed to frontend**:
  - `init_db` - Initialize SQLite
  - `get_local_data` - Fetch from SQLite
  - `save_local_data` - Save and queue for sync
  - `sync_with_server` - Push/pull changes

### 3. Frontend Hooks

#### `useOnlineStatus()`
- Monitors `navigator.onLine`
- Auto-triggers sync when connection restored
- Returns: `{ isOnline, isSyncing, lastSyncedAt, pendingChanges, syncError }`

#### `useLocalData<T>()`
- Fetch data from local SQLite
- Save data (triggers automatic sync queueing)
- Returns: `{ data, isLoading, error, saveItem, saveItems, reload }`

### 4. Sync Flow

**When OFFLINE:**
```
User action → Save to SQLite → Add to sync_queue → Update React state ✓
```

**When ONLINE (Auto-trigger):**
```
Network restored → Detect online → Trigger sync → 
  Push sync_queue to Supabase →
  Pull new changes from Supabase →
  Apply to SQLite →
  Resolve conflicts →
  Clear sync_queue →
  Update React state ✓
```

**Conflict Resolution:**
- Tracks `version` field for each record
- Last-write-wins strategy (remote version takes precedence)
- Manual review option available

## Database Schema

### Tables
- `customers` - Full copy of cloud customers
- `invoices` - Full copy of cloud invoices
- `batches` - Full copy of inventory batches
- `doctors` - Full copy of doctors/referrers
- `supplier_bills` - Full copy of supplier bills
- `sync_queue` - Pending changes (insert/update/delete)
- `sync_metadata` - Sync tracking metadata

### Key Fields
All tables include:
- `version` (INT) - Record version for conflict detection
- `synced` (BOOLEAN) - Whether record is synced
- Creation/modification timestamps

## Usage in Components

### Example: Invoice Creation
```tsx
export function InvoiceBuilder() {
  const { data: customers, saveItem } = useLocalData({
    table: 'customers',
    tenantId,
  });
  const { isOnline, isSyncing } = useOnlineStatus();

  async function handleSave(invoice) {
    // Save locally (works offline)
    await saveItem(invoice, 'insert');
    
    // Show sync status
    if (isOnline && !isSyncing) {
      // Will auto-sync in background
    }
  }

  return (
    <div>
      {isSyncing && <div>Syncing...</div>}
      {!isOnline && <div>Offline mode - changes will sync</div>}
    </div>
  );
}
```

## Next Steps

### Phase 2: Full Sync Engine Implementation
- [ ] Implement change tracking and queuing
- [ ] Build Supabase API calls for sync
- [ ] Handle conflict scenarios
- [ ] Add retry logic and error handling

### Phase 3: UI Integration
- [ ] Add sync status indicators to dashboard
- [ ] Create conflict resolution UI
- [ ] Add manual sync button
- [ ] Show pending changes count

### Phase 4: Building & Distribution
- [ ] Build Windows EXE/MSI installer
- [ ] Add auto-update capability
- [ ] Create installer with Tauri bundler
- [ ] Set up code signing (optional)

## Building the App

```bash
# Development
npm run tauri dev

# Build Windows EXE
npm run tauri build -- --target x86_64-pc-windows-gnu

# Output locations
# - EXE: src-tauri/target/release/medixor.exe
# - MSI Installer: src-tauri/target/release/bundle/msi/
```

## Configuration

### Tauri Config (src-tauri/tauri.conf.json)
- Dev server: `http://localhost:3000` (Next.js dev)
- Build frontend dist: `.next` directory
- Windows app dimensions: 1200x800

### Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```
