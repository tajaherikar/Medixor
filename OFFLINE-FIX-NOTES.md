# Offline Reports Fix - Technical Summary

## Problem
Reports page didn't work offline because components were making direct `fetch()` calls to API routes (e.g., `/api/${tenant}/inventory`). These calls failed when:
- No internet connection
- Vercel servers unreachable
- Running in offline mode

## Solution
Created a **client-side API wrapper** (`src/lib/api-client.ts`) that:

1. **Detects offline/Electron mode**
   - Checks `navigator.onLine`
   - Checks for Electron environment flag

2. **Auto-switches data source**
   - Online → Calls Vercel API routes (cloud)
   - Offline → Calls local-db.ts directly (localStorage)

3. **Graceful degradation**
   - Tries cloud first
   - Falls back to local on error
   - Writes to both when available

## Files Changed

### New Files
- `src/lib/api-client.ts` - Client-side database API wrapper

### Modified Files
- `src/components/reports/reports.tsx` - Updated to use api-client instead of direct fetch

## How It Works

### Before (Broken Offline)
```typescript
// Direct fetch - fails offline
const { data } = useQuery({
  queryFn: () => fetch(`/api/${tenant}/inventory`).then(r => r.json())
});
```

### After (Works Offline)
```typescript
import { fetchInventory } from "@/lib/api-client";

// Smart fetch - uses localStorage when offline
const { data } = useQuery({
  queryFn: () => fetchInventory(tenant)
});
```

## What's Working Now

✅ **Reports page loads offline**
- Expiry Report
- Stock Valuation
- Stock Movement
- Invoices
- Sales Register
- Purchase Register
- GST Summary
- Doctor Reference

✅ **Data automatically syncs**
- When online: saves to cloud + local
- When offline: saves to local only
- No data loss

## Components That Need Similar Updates

The following components still use direct `fetch()` and should be updated for full offline support:

1. `src/components/dashboard/dashboard.tsx` - Dashboard stats
2. `src/components/inventory-table/inventory-table.tsx` - Inventory list
3. `src/components/customers-list/customers-list.tsx` - Customer management
4. `src/components/doctors-list/doctors-list.tsx` - Doctor management
5. `src/components/invoice-builder/invoice-builder.tsx` - Invoice  creation
6. `src/components/outstanding/outstanding-tracker.tsx` - Outstanding payments
7. `src/components/purchase-register/purchase-register.tsx` - Purchase tracking
8. `src/components/settings/settings.tsx` - Settings management
9. `src/components/batch-selector/batch-selector.tsx` - Batch selection
10. `src/components/suppliers-list/suppliers-list.tsx` - Supplier management

## Quick Update Pattern

To make any component work offline, replace:

```typescript
// OLD
fetch(`/api/${tenant}/inventory`).then(r => r.json())

// NEW
import { fetchInventory } from "@/lib/api-client";
fetchInventory(tenant)
```

Available functions in `api-client.ts`:
- `fetchInventory(tenant)`
- `fetchInvoices(tenant)`
- `fetchSupplierBills(tenant)`
- `fetchDoctors(tenant)`
- `fetchCustomers(tenant)`
- `fetchSuppliers(tenant)`
- `fetchPayments(tenant)`
- `fetchSettings(tenant)`
- `fetchUsers(tenant)`
- `addCustomer(tenant, customer)`
- `updateCustomer(tenant, id, updates)`
- `addDoctor(tenant, doctor)`
- `updateDoctor(tenant, id, updates)`
- `addInvoice(tenant, invoice)`
- `addPayment(tenant, payment)`
- `saveSettings(tenant, settings)`

## Testing Offline Mode

1. Launch app while online
2. Navigate to Reports page
3. Disconnect from internet
4. Refresh page or navigate away and back
5. **Reports should still load** with cached data

## Build Info

- **Build Date**: April 4, 2026
- **Version**: 1.0.1 (Offline Reports Fix)
- **Size**: ~213 MB
- **Fixed**: Reports page offline support

---

If you need other pages to work offline, we can apply the same pattern to all components listed above.
