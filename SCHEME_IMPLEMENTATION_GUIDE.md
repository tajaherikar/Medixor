# Pharmaceutical Scheme Implementation Guide

## Overview
This document explains the scheme (free samples) feature for bulk pharmaceutical purchases.

**Scheme Types:**
- Supplier schemes: "10+1", "10+5" (free items from supplier)
- Customer schemes: Custom schemes offered to customers (can differ from supplier)
- Inventory impact: Total inventory = paid quantity + scheme quantity

---

## Data Model

### 1. **Batch** (Inventory)
```typescript
interface Batch {
  // ... existing fields
  originalQty: number;      // Quantity paid for (billed by supplier)
  availableQty: number;     // Total inventory (originalQty + schemeQuantity)
  schemeQuantity?: number;  // Free samples from supplier (e.g., 1 in "10+1")
  schemePattern?: string;   // Pattern reference: "10+1", "10+5", etc.
}
```

**Example:**
- Supplier bill shows: 10 tablets + 1 free scheme → Batch created with:
  - `originalQty: 10` (what was paid for)
  - `schemeQuantity: 1` (free items)
  - `availableQty: 11` (total inventory)
  - `schemePattern: "10+1"`

---

### 2. **SupplierBillItem** (Purchase Records)
```typescript
interface SupplierBillItem {
  // ... existing fields (itemName, quantity, purchasePrice, lineTotal, etc.)
  
  // NEW: Scheme fields
  schemeQuantity?: number; // Free items (e.g., 1)
  schemePattern?: string;  // Pattern (e.g., "10+1")
  
  // IMPORTANT: Cost calculations (taxableAmount, gsT, lineTotal)
  // are based on quantity ONLY, not schemeQuantity
}
```

**Cost Calculation Rule:**
- `taxableAmount = purchasePrice × quantity` (NOT including schemeQuantity)
- GST, CGST, SGST calculated on quantity only
- Scheme items have zero cost (they're free)

---

### 3. **InvoiceLineItem** (Customer Billing)
```typescript
interface InvoiceLineItem {
  // ... existing fields (itemName, quantity, mrp, lineTotal, etc.)
  
  // NEW: Scheme fields
  schemeQuantity?: number; // Free items offered to customer (optional, custom per customer)
  schemePattern?: string;  // Pattern (e.g., "10+1", "20+2", etc.)
  
  // IMPORTANT: Billing is based on quantity only, not schemeQuantity
  // schemeQuantity is informational - customer gets it free
}
```

**Billing Rule:**
- Invoice line total = `mrp × quantity` (NOT including schemeQuantity)
- Customer receives `schemeQuantity` items free as bonus
- Can be different from supplier scheme

---

## UI Implementation

### 1. **Supplier Bill Form** (`supplier-bill-form.tsx`)

Add scheme fields to each line item:

```tsx
// For each line item in the form:

// Input 1: Quantity (paid for)
<Input
  label="Quantity"
  value={item.quantity}
  onChange={(val) => updateItem(index, 'quantity', parseInt(val))}
/>

// Input 2: Scheme Quantity (NEW)
<Input
  label="Scheme Qty"
  placeholder="Free items (optional)"
  value={item.schemeQuantity || ''}
  onChange={(val) => updateItem(index, 'schemeQuantity', parseInt(val) || 0)}
  hint="Free items in scheme (e.g., 1 in 10+1)"
/>

// Input 3: Scheme Pattern (NEW - Optional)
<Input
  label="Scheme Pattern"
  placeholder="10+1, 10+5, etc."
  value={item.schemePattern || ''}
  onChange={(val) => updateItem(index, 'schemePattern', val)}
  hint="Pattern for reference only"
/>

// Display: Total Received Qty
<span className="text-gray-600">
  Total Received: {item.quantity + (item.schemeQuantity || 0)} units
</span>
```

**Key Points:**
- ✅ Costs calculated on `quantity` only (unchanged behavior)
- ✅ Scheme inputs are optional (backward compatible)
- ✅ Display total inventory clearly
- ✅ Locked after bill creation (immutable)

---

### 2. **Inventory Display** (Dashboard / Inventory Table)

Show scheme breakdown in inventory:

```tsx
<div className="space-y-1">
  <p className="font-semibold">{batch.itemName}</p>
  <p className="text-sm text-gray-600">
    Inventory: {batch.originalQty} (paid) + {batch.schemeQuantity || 0} (free) = {batch.availableQty}
  </p>
  {batch.schemePattern && (
    <p className="text-xs text-blue-600">Scheme: {batch.schemePattern}</p>
  )}
</div>
```

or in a table column:

```tsx
// Column: Schemel pattern
{batch.schemePattern ? (
  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
    {batch.schemePattern}
  </span>
) : (
  <span className="text-gray-400">—</span>
)}
```

---

### 3. **Invoice Builder** (`invoice-builder.tsx`)

Add custom scheme for each line item:

```tsx
// For each line item:

// Existing fields remain unchanged
<Input
  label="Quantity"
  value={item.quantity}
  onChange={(val) => updateItem(index, 'quantity', parseInt(val))}
/>

// NEW: Custom Scheme for Customer
<Input
  label="Scheme Qty"
  placeholder="Free items to offer (optional)"
  value={item.schemeQuantity || ''}
  onChange={(val) => updateItem(index, 'schemeQuantity', parseInt(val) || 0)}
  hint="Can differ from supplier scheme"
/>

<Input
  label="Scheme Pattern"
  placeholder="10+1, 10+2, etc."
  value={item.schemePattern || ''}
  onChange={(val) => updateItem(index, 'schemePattern', val)}
/>

// Display: What customer gets
<span className="text-green-600">
  Customer gets: {item.quantity} (billed) + {item.schemeQuantity || 0} (free)
</span>
```

**Key Points:**
- ✅ Customer scheme can be different from supplier scheme
- ✅ Billing unchanged (customer pays for `quantity` only)
- ✅ Scheme is bonus value to customer
- ✅ Shows ROI for scheme investment

---

## Backend/API Implementation

### 1. **When Creating Batch from Supplier Bill**

```typescript
// In API route (e.g., POST /api/[tenant]/supplier-bills)

for (const item of supplierBill.items) {
  const batch: Batch = {
    id: uuid(),
    itemName: item.itemName,
    originalQty: item.quantity,
    schemeQuantity: item.schemeQuantity || 0,
    schemePattern: item.schemePattern,
    // IMPORTANT: Total inventory includes scheme
    availableQty: item.quantity + (item.schemeQuantity || 0),
    // ... other fields
  };
  
  await db.addBatch(batch);
}
```

### 2. **When Calculating Supplier Cost** (NO CHANGE)

```typescript
// Cost = purchasePrice × quantity (NOT × availableQty)
const taxableAmount = item.purchasePrice * item.quantity; // ✓ Correct
const taxableAmount = item.purchasePrice * (item.quantity + item.schemeQuantity); // ✗ Wrong
```

### 3. **When Customer Allocates Batch to Invoice**

```typescript
// When picking batch for invoice line item
const allocation = {
  batchId: batch.id,
  quantity: 10,           // Customer buys 10 units
  schemeQuantity: 2,      // Offer 2 free (custom scheme)
  schemePattern: "10+2",
};

// Inventory deduction (only deduct paid quantity)
batch.availableQty -= 10; // NOT (10 + 2)
```

---

## Reports & Analytics

### 1. **Scheme Margin Calculation** (in Dashboard/Reports)

Use the utility function from `batch-logic.ts`:

```typescript
import { calculateSchemeBenefit } from "@/lib/batch-logic";

const benefit = calculateSchemeBenefit(
  schemeQty: 5,           // 5 free items given
  mrp: 100,               // ₹100 per unit
  purchasePrice: 40       // ₹40 cost per unit
);

// Results:
// - schemeRevenue: ₹500 (5 × 100)
// - schemeMarginPerUnit: ₹60 (100 - 40)
// - totalSchemeMargin: ₹300 (5 × 60)
```

**Display in Reports:**
- Scheme given: 500 units
- Scheme value (at MRP): ₹50,000
- Scheme cost (at purchase price): ₹20,000
- **Scheme margin: ₹30,000** ✓

---

## Key Business Rules

1. **Immutability**: Once supplier bill is saved, scheme cannot be modified (audit trail)
2. **Inventory Accuracy**: `availableQty` always = `originalQty` + `schemeQuantity`
3. **Cost Integrity**: Costs always based on paid quantity, never includes scheme
4. **Customer Control**: Retailers can offer different schemes than what they received
5. **Margin Visibility**: Scheme benefit clearly shown in profit calculations

---

## Migration Path (if adding to existing data)

For existing supplier bills/batches without scheme info:

```typescript
// Mark as having no scheme
batch.schemeQuantity = 0;
batch.schemePattern = undefined;

// This maintains: availableQty = originalQty + 0 = originalQty (correct)
```

---

## Summary

| Field | Supplier Bill | Batch | Invoice |
|-------|---|---|---|
| `quantity` | ✓ Billed qty | ✓ (originalQty) | ✓ Charged qty |
| `schemeQuantity` | ✓ NEW | ✓ NEW | ✓ NEW (custom) |
| `schemePattern` | ✓ NEW | ✓ NEW | ✓ NEW |
| Cost basis | `quantity` ❌ NOT scheme | `originalQty` ❌ NOT scheme | `quantity` ❌ NOT scheme |
| Inventory total | — | `originalQty + schemeQty` | Deduct `quantity` only |

