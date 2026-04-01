# Medixor UX Pain Points: Quick Reference Guide

## 📍 File Locations & Code Snippets

### 🔴 CRITICAL ISSUES

---

#### 1. Invoice Builder - Overwhelming Complexity
**File:** `src/components/invoice-builder/invoice-builder.tsx`

**Problem:**
- 300+ lines of component logic
- Too many simultaneous decisions (customer, items, discount, payment status)
- Nested modal for batch selector
- Dense line item table on mobile

**Lines to Focus On:**
- Line 30-60: State declarations (7+ useState hooks)
- Line 80-100: Form rendering with all options visible
- Line 200+: Line item table (dense, needs scroll on mobile)

**Quick Fix Priority:** Convert to multi-step wizard (Phase 2)

---

#### 2. No Draft Save / Auto-Save
**File:** `src/components/invoice-builder/invoice-builder.tsx` & `supplier-bill-form.tsx`

**Problem:**
- On browser crash or accidental navigation → all data lost
- No indication that form has unsaved data
- Form resets immediately on submit success

**Lines to Find:**
- Search for `const [lineItems]` — add localStorage sync here
- Search for `async function handleSave()` — add clearStorage here
- Search for `setTimeout(() => reset())` — add toast here

**Quick Fix Priority:** Add localStorage + unsaved warning (Phase 1 - 1 hour)

---

#### 3. Error Handling via alert()
**Files:**
- `src/components/supplier-bill-form/supplier-bill-form.tsx` — Line ~160
- `src/components/invoice-builder/invoice-builder.tsx` — Line ~250
- `src/components/batch-selector/batch-selector.tsx` — Line ~80

**Problem:**
```typescript
// Current (bad)
alert(`Failed to save bill: ${msg}`);

// Should be
toast.error(`Failed to save bill: ${msg}`);
```

**Search Strings:**
1. `alert(` → Replace all with toast notification
2. `setError(` → Often for alerts, check context

**Quick Fix Priority:** Find & replace all (Phase 1 - 30 min)

---

---

### 🟠 HIGH PRIORITY ISSUES

#### 4. Batch Selector Modal Within Modal
**File:** `src/components/invoice-builder/invoice-builder.tsx`

**Problem:**
```typescript
// Line ~250 - Modal opens within another modal
return (
  <div className="space-y-6">
    {/* Invoice form */}
    
    {addItemsOpen && (
      <BatchSelector
        tenant={tenant}
        strategy={strategy}
        onAdd={handleAddAllocations}
      />
    )}  // ← This modal loses context of invoice form
  </div>
);
```

**Solution:** Move to side panel or step 2 of wizard

---

#### 5. No Column Headers in Forms
**File:** `src/components/supplier-bill-form/supplier-bill-form.tsx`

**Problem:**
- Line items rendered without table headers
- Users unsure what each field represents
- Especially bad on desktop

**Current Structure (around line 200):**
```typescript
{fields.map((field, idx) => (
  <div key={field.id} className="grid sm:grid-cols-12 gap-2">
    {/* 12 input fields with no labels visible */}
  </div>
))}
```

**Fix:** Add header row above fields

---

#### 6. No Confirmation Dialog Before Save
**Files:**
- `src/components/invoice-builder/invoice-builder.tsx` - Line ~280
- `src/components/supplier-bill-form/supplier-bill-form.tsx` - Line ~160

**Problem:**
```typescript
// Direct submit without confirmation
async function onSubmit(data: BillFormValues) {
  const res = await fetch(`/api/${tenant}/supplier-bills`, {
    method: "POST",
    // ...
  });
}
```

**Solution:** Add AlertDialog before submission

---

#### 7. Mobile Responsiveness Gaps
**Files:**
- `src/components/inventory-table/inventory-table.tsx` - Line ~30 (hidden columns)
- `src/components/invoice-builder/invoice-builder.tsx` - Line ~200 (line item table)
- `src/app/globals.css` - Grid breakpoints

**Problem:**
```typescript
// Hidden on mobile
meta: { className: "hidden sm:table-cell" },
```

**Solution:** Use collapsible/expandable rows or side summary on mobile

---

---

### 🟡 MEDIUM PRIORITY ISSUES

#### 8. Notifications Lost On Refresh
**File:** `src/components/top-header.tsx`

**Problem:**
- Line ~55: Read/cleared state stored in component useState
- Lost on page refresh
- No filtering or grouping by priority

**Current (bad):**
```typescript
const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
const [clearedNotifications, setClearedNotifications] = useState<Set<string>>(new Set());
```

**Solution:** 
1. Move to Zustand store (`src/lib/stores.ts`)
2. Add filtering by severity
3. Add group headers

---

#### 9. Search Results Limited
**File:** `src/components/search-modal.tsx`

**Problem:**
- Line ~60-70: Results capped at 4/3/3
```typescript
.slice(0, 4)  // ← Inventory results capped
.slice(0, 3)  // ← Customer & supplier capped
```

**Solution:** 
- Increase limits or add pagination
- Add "See all" link
- Implement fuzzy search

---

#### 10. Form Reset With 1.5s Delay Confusing
**File:** `src/components/supplier-bill-form/supplier-bill-form.tsx`

**Problem:**
- Line ~160-170: Success behavior unclear
```typescript
setSubmitted(true);
setTimeout(() => {
  reset();
  setSubmitted(false);
  onSuccess?.();
}, 1500);  // ← Why delay? Confusing
```

**Solution:**
- Show success toast immediately
- Reset form state
- Add visual confirmation
- Don't use arbitrary delays

---

#### 11. No Breadcrumbs
**Files:**
- `src/components/tenant-shell.tsx` - Could add above children
- `src/components/top-header.tsx` - Could show in header

**Problem:**
- After navigation, unclear current location
- No easy way to go back to parent section

**Solution:** Add breadcrumb navigation component

---

#### 12. Sidebar Descriptions Take Space
**File:** `src/components/sidebar-nav.tsx`

**Problem:**
- Line ~30-50: Each nav item has description (2+ lines)
- Takes up valuable real estate on mobile
- Could be tooltips instead

**Current:**
```typescript
const navItems = [
  { label: "Dashboard",    description: "Overview & alerts" },
  { label: "Inventory",    description: "Batch-level stock" },
  // ... 6 more items
];
```

**Solution:** Show descriptions only on hover (tooltip)

---

---

## 🔧 File Structure for Improvements

```
src/
├── components/
│   ├── invoice-builder/
│   │   ├── invoice-builder.tsx          ← REWRITE as wizard
│   │   ├── steps/                       ← NEW folder
│   │   │   ├── customer-step.tsx        ← NEW
│   │   │   ├── items-step.tsx           ← NEW
│   │   │   ├── review-step.tsx          ← NEW
│   │   │   └── success-step.tsx         ← NEW
│   │   └── batch-selector-inline.tsx    ← NEW (inline version)
│   │
│   ├── supplier-bill-form/
│   │   ├── supplier-bill-form.tsx       ← IMPROVE headers & error handling
│   │   ├── bill-form-headers.tsx        ← NEW
│   │   └── bill-totals.tsx              ← NEW (component refactor)
│   │
│   ├── ui/
│   │   ├── notification-group.tsx       ← NEW (for filtering)
│   │   ├── breadcrumb.tsx               ← NEW
│   │   └── unsaved-indicator.tsx        ← NEW
│   │
│   └── top-header.tsx                   ← IMPROVE notifications
│
├── lib/
│   ├── stores.ts                        ← ADD notification store
│   └── export.ts                        ← NEW (CSV/PDF export)
│
└── hooks/
    ├── useUnsavedChanges.ts             ← NEW
    └── useAutoSave.ts                   ← NEW
```

---

## 🚀 Quick Implementation Order

### Today (Phase 1 - 2-3 hours)
1. **Find & Replace `alert()` with toast** (30 min)
   - Files: invoice-builder.tsx, supplier-bill-form.tsx, batch-selector.tsx
   - Search: `alert(`

2. **Add Unsaved Changes Warning** (30 min)
   - Create `src/hooks/useUnsavedChanges.ts`
   - Add to invoice-builder.tsx & supplier-bill-form.tsx

3. **Improve Form Success States** (20 min)
   - Replace setTimeout reset with immediate toast
   - Add visual success indicator

4. **Add Form Column Headers** (20 min)
   - supplier-bill-form.tsx ~line 200
   - Simple grid with labels above fields

5. **Add Tooltips** (20 min)
   - Create tooltip wrappers for MRP, FEFO, GST Rate

### This Week (Phase 2 - 4-5 hours)
- [ ] Multi-step invoice builder wizard
- [ ] Inline batch selector
- [ ] Auto-save to localStorage
- [ ] Mobile form improvements
- [ ] Notification categorization

### Next Week (Phase 3 - 8-10 hours)
- [ ] Breadcrumbs
- [ ] Bulk operations
- [ ] CSV export
- [ ] Advanced notifications

---

## 🧪 Testing Checklist

### Before Deploying Phase 1:
- [ ] Test all error toasts display correctly
- [ ] Test unsaved changes warning on navigation
- [ ] Test success states after form submit
- [ ] Test confirmations on delete/save
- [ ] Test tooltips on desktop & mobile
- [ ] Test form headers visible and aligned

### Before Deploying Phase 2:
- [ ] Test wizard step navigation
- [ ] Test inline batch selector
- [ ] Test localStorage recovery
- [ ] Test mobile views at 375px width
- [ ] Test notification filtering
- [ ] Verify all form data persists between steps

### Before Deploying Phase 3:
- [ ] Test breadcrumbs at all depths
- [ ] Test bulk operations (select, export, delete)
- [ ] Test CSV export format
- [ ] Test keyboard shortcuts
- [ ] Test on iOS/Android
- [ ] Performance test with 1000+ batches

---

## 📞 Questions to Ask

1. **Invoice Builder Decisions:**
   - Should wizard have "Save Draft" button per step?
   - Should users be able to edit line items after "Review" step?
   - Should print happen immediately or let user continue billing?

2. **Auto-Save:**
   - Should localStorage draft expire after X days?
   - Should there be a "Drafts" list users can access?
   - What size limit for localStorage?

3. **Mobile:**
   - What's the primary mobile use case?
   - Full invoice creation or quick reference only?
   - Should mobile have simplified form vs desktop?

4. **Bulk Operations:**
   - Which lists need bulk delete? (Customers, Inventory, Invoices?)
   - Should there be bulk price updates?
   - Should bulk operations be audit-logged?

---

*Last Updated: April 1, 2026*
