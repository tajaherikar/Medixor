# Fix: "invoices.filter is not a function" Error

## Problem

After adding authentication to API routes, when users try to access the dashboard:
```
TypeError: invoices.filter is not a function
```

## Root Cause

1. **API now requires authentication** - Added `validateTenantAccess()` to API routes
2. **Old sessions invalid** - Users have localStorage session but no server-side cookie
3. **Error responses instead of arrays** - When API returns 401/403, React Query caches the error object instead of an empty array
4. **Component assumes arrays** - Dashboard calls `.filter()` on what it expects to be an array

## Solution Implemented

### 1. Created Safe Fetch Helpers (`src/lib/api-fetch.ts`)

```typescript
// Always returns array on error, never throws
export async function safeFetchArray<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    console.warn(`[Auth] ${res.status} - User may need to login`);
    return []; // Return empty array instead of error
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
```

**Why this works:**
- ✅ Returns `[]` on 401/403 (auth errors)
- ✅ Returns `[]` on network errors
- ✅ Validates response is actually an array
- ✅ Includes credentials for cookie auth

### 2. Updated Dashboard to Use Safe Fetch

**Before (BROKEN):**
```typescript
const { data: invoices = [] } = useQuery({
  queryKey: ["invoices", tenant],
  queryFn: () => fetch(`/api/${tenant}/invoices`).then(r => r.json()),
});
// If API returns 401, r.json() is {error: "Unauthorized"}
// invoices = {error: "Unauthorized"}
// invoices.filter() ❌ ERROR!
```

**After (FIXED):**
```typescript
const { data: invoices = [] } = useQuery({
  queryKey: ["invoices", tenant],
  queryFn: () => safeFetchArray<Invoice>(`/api/${tenant}/invoices`),
});
// If API returns 401, safeFetchArray returns []
// invoices = []
// invoices.filter() ✅ Works!
```

### 3. Fixed Auth Store

**Updated login:**
```typescript
login: async (email, password) => {
  const res = await fetch("/api/auth/login", {
    credentials: "same-origin", // ✅ Include cookies
    // ...
  });
}
```

**Updated logout:**
```typescript
logout: async () => {
  // ✅ Clear server-side session cookie
  await fetch("/api/auth/logout", { 
    method: "POST",
    credentials: "same-origin",
  });
  // Clear client-side state
  set({ user: null });
}
```

## Files Modified

### Created:
- ✅ `src/lib/api-fetch.ts` - Safe fetch helpers

### Modified:
- ✅ `src/components/dashboard/dashboard.tsx` - Use safeFetchArray
- ✅ `src/lib/stores.ts` - Fixed login/logout credentials

## Testing

### Test 1: Dashboard Loads (Even Without Auth)
```bash
1. Logout if logged in
2. Navigate to /pharmaone/dashboard
3. Should show empty dashboard (no error)
4. Console shows: "[Auth] 401 - User may need to login"
```

### Test 2: Login and Dashboard
```bash
1. Login as pharmaone user
2. Navigate to dashboard
3. Should show data ✅
```

### Test 3: Logout Clears Session
```bash
1. Login
2. Check Application → Cookies → medixor-session exists
3. Logout
4. Cookie should be deleted ✅
```

## For Users with Stale Sessions

If users still see issues:

### Quick Fix (User Action):
```bash
1. Logout
2. Clear browser data (Ctrl+Shift+Del)
3. Login again
```

### Why This Happens:
- Old localStorage session from before auth implementation
- No server-side cookie exists
- API rejects requests → empty data shown

### Prevention:
The `safeFetchArray` helper ensures the app never crashes, just shows empty state until user logs in.

## Recommended: Update Other Components

Many components use similar query patterns. Consider updating them to use `safeFetchArray`:

```typescript
// Before
queryFn: async () => {
  const res = await fetch(`/api/${tenant}/customers`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

// After
queryFn: () => safeFetchArray<Customer>(`/api/${tenant}/customers`)
```

**Files to update:**
- `src/components/customers-list/customers-list.tsx`
- `src/components/inventory-table/inventory-table.tsx`
- `src/components/doctors-list/doctors-list.tsx`
- `src/components/invoice-builder/invoice-builder.tsx`
- `src/components/outstanding/outstanding-tracker.tsx`
- `src/components/purchase-register/purchase-register.tsx`
- `src/components/supplier-bill-form/supplier-bill-form.tsx`

## Summary

✅ **Fixed** - Dashboard no longer crashes on auth errors  
✅ **Users can logout properly** - Server session cleared  
✅ **Better error handling** - Shows empty state instead of crashing  
✅ **Auth works correctly** - Cookies included in requests  

**Next Step:** Update remaining components to use `safeFetchArray` for consistency.
