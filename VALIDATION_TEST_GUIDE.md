# Invoice Checksum Validation - Local Testing Guide

## What We're Testing

The system now validates invoices and supplier bills before saving to catch rounding errors and calculation mistakes:

### Validation Checks
1. **Customer Discount Validity**: Discount ≥ 0 and ≤ subtotal
2. **Grand Total Calculation**: (Subtotal - Discount) + TotalGst = GrandTotal
3. **Tolerance**: 0.01 paise allowed for rounding differences

---

## Test Setup

1. **Start local dev server**
   ```bash
   npm run dev
   ```
   - Open http://localhost:3000
   - Login with any credentials (dev mode)

2. **Navigate to**: [tenant]/billing → Create Invoice

---

## Test Scenario 1: Valid Invoice (Should Pass ✅)

### Steps:
1. Select a customer
2. Add 2 line items:
   - Item 1: 10 units @ ₹100 (12% GST) = ₹1000 taxable, ₹120 GST
   - Item 2: 5 units @ ₹50 (12% GST) = ₹250 taxable, ₹30 GST
3. **Subtotal**: ₹1,250
4. **Total GST**: ₹150 (₹75 CGST + ₹75 SGST)
5. **Grand Total**: ₹1,400
6. **No customer discount**
7. Click "Save Invoice"

### Expected Result:
✅ Invoice saves successfully
- Toast: "Invoice saved · [amount] · [customer name]"
- Form clears
- "Print Last Invoice" button appears

---

## Test Scenario 2: Invalid Grand Total (Should Fail ❌)

### Setup:
We'll manually corrupt the calculation to trigger validation error

1. Add same line items as Scenario 1
2. **Intercept before save** using browser DevTools:
   - Open DevTools → Network tab
   - Add customer discount of ₹50 (Subtotal - Discount = ₹1,200)
   - Expected: ₹1,200 + ₹150 = ₹1,350 grandTotal
3. **Manually modify** the payload in DevTools:
   - Change `grandTotal` from 1350 to 1360 (intentional error)
4. Click "Save Invoice"

### Expected Result:
❌ Invoice fails validation
- Red alert box appears: "Invoice Validation Failed"
- Shows message: "Grand total mismatch: Expected ₹1,350.00, got ₹1,360.00"
- Toast: "Invoice validation failed"
- **Form persists** (data not cleared) - you can fix and retry

---

## Test Scenario 3: Invalid Discount (Should Fail ❌)

### Steps:
1. Add line items with ₹1,000 subtotal
2. Set customer discount to ₹1,500 (exceeds subtotal!)
3. Click "Save Invoice"

### Expected Result:
❌ Validation fails
- Alert shows: "Invalid customer discount: ₹1,500.00 (should be between ₹0 and ₹1,000.00)"
- Form persists for correction

---

## Test Scenario 4: Supplier Bill Validation (Should Pass ✅)

### Navigate to: Suppliers → Add Bill

### Steps:
1. Select a supplier
2. Add items:
   - Item 1: Quantity 20 @ ₹50 = ₹1,000
   - Item 2: Quantity 10 @ ₹30 = ₹300
3. **Taxable**: ₹1,300
4. **GST**: ₹156 (12% on ₹1,300)
5. **Grand Total**: ₹1,456
6. Submit

### Expected Result:
✅ Bill saves successfully
- Data visible in Purchase Register
- Bills appear on Suppliers page

---

## Test Scenario 5: Supplier Bill with Invalid Total (Should Fail ❌)

### Steps:
1. Create bill with:
   - Taxable: ₹1,000
   - GST: ₹120
   - Expected Grand Total: ₹1,120
2. Manually modify payload to ₹1,150 (wrong)
3. Submit

### Expected Result:
❌ Validation catches it
- Alert: "Supplier bill validation failed"
- Shows expected vs actual grand total
- You can fix and retry

---

## To Test Payload Interception (DevTools Method)

### Browser Console Approach:
```javascript
// In browser's Network tab, use:
// 1. Check "Request blocking" for /api/*/invoices
// 2. Right-click → Edit and resend
// 3. Modify grandTotal in JSON body to test
```

### Or Use Fetch Intercept:
```javascript
// Paste in console to monkey-patch fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Request:', args);
  // Intercept POST to /invoices
  if (args[0].includes('/invoices') && args[1]?.method === 'POST') {
    const body = JSON.parse(args[1].body);
    console.log('Original payload:', body);
    // Modify body.grandTotal here for testing
    args[1].body = JSON.stringify(body);
  }
  return originalFetch.apply(this, args);
};
```

---

## What You'll See (UI Feedback)

### On Success:
```
✓ Success Toast: "Invoice saved · ₹1,400.00 · Customer Name"
→ Form clears after 1.5 seconds
```

### On Validation Error:
```
Red Alert Box:
┌─────────────────────────────────────────────┐
│ ⚠ Invoice Validation Failed                 │
│                                             │
│ • Grand total mismatch: Expected ₹1,350.00, │
│   got ₹1,360.00                             │
│                                             │
│ 💡 This check prevents invalid financial   │
│   records...                                │
└─────────────────────────────────────────────┘
```

---

## Key Testing Points

### ✅ Validate These Work:
- [ ] Valid invoice saves without errors
- [ ] Valid supplier bill saves and appears in Purchase Register
- [ ] Corrupted grand total is caught
- [ ] Invalid discount is caught
- [ ] Error messages are clear and helpful
- [ ] Form persists (doesn't clear) on validation failure
- [ ] User can fix and retry without reloading
- [ ] Tolerance works: ±₹0.01 allowed

### 🔍 Inspect Validation Logic:
```typescript
// In src/lib/gst-calculator.ts, line 354+
validateInvoice({
  subtotal: 1000,
  customerDiscountAmount: 50,
  totalGst: 120,
  grandTotal: 1070 // This will FAIL if not exactly (1000-50)+120=1070
})
```

---

## Debugging Tips

### If validation passes when it shouldn't:
1. Check tolerance in `validateMoneyTotal(expected, actual, 0.01)`
2. Verify line item GST calculations in `calculateInvoice()`
3. Check if discount is applied correctly

### If validation fails when it shouldn't:
1. Check floating-point rounding in calculations
2. Verify all line items have correct GST rate
3. Ensure no double-discounting

### Check Handler Response:
```bash
# In browser DevTools → Network tab
# Click on POST /invoices request
# Response tab should show either:
# - { id: "inv-...", tenantId: "...", ... } ← Success
# - { error: "Invoice validation failed", discrepancies: [...], ... } ← Fail
```

---

## Expected Discrepancies Array Format

```json
{
  "error": "Invoice validation failed",
  "discrepancies": [
    "Grand total mismatch: Expected ₹1,350.00, got ₹1,360.00",
    "Invalid customer discount: ₹1,500.00 (should be between ₹0 and ₹1,000.00)"
  ],
  "expected": { "grandTotal": 1350.00 },
  "actual": { "grandTotal": 1360.00 }
}
```

This is what the UI displays in the alert box.

---

## Summary of Changes

**New Validation Functions** (`src/lib/gst-calculator.ts`):
- `validateInvoice()` - Checks customer discount & grand total
- `validateSupplierBill()` - Checks taxable + GST = grandTotal

**Updated Handlers** (`src/lib/mock/handlers.ts`):
- `POST /invoices` - Validates before save, returns 400 if invalid
- `POST /supplier-bills` - Same validation as POST /invoices
- `PUT /supplier-bills/:billId` - Same validation on update

**New UI Component** (`src/components/ui/validation-error-alert.tsx`):
- Displays validation errors with expected vs actual values
- Shows helpful tips to fix

**Updated Invoice Builder** (`src/components/invoice-builder/invoice-builder.tsx`):
- Handles validation errors separately from save errors
- Displays `<ValidationErrorAlert />` component
- Form persists on validation failure (user can edit and retry)
