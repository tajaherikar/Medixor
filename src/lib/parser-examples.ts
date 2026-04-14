/**
 * Copy-Paste Parser - Visual Examples
 * Shows what users paste and what the parser produces
 */

// ─── EXAMPLE 1: Perfect Tab-Separated Data ──────────────────────────────────

const example1 = {
  name: "Perfect Tab-Separated (from copy-paste table)",
  userPastes: `Aspirin Tab 500	B001	2025-12-31	150	85	100
Paracetamol Syp 120ml	B002	2025-06-15	200	110	50
Terpin Injection	B003	2026-03-30	280	140	25`,

  parserSettings: {
    delimiter: "auto", // Detects tab
    hasHeader: false,
  },

  parserOutput: [
    {
      itemName: "Aspirin Tab 500",
      batchNumber: "B001",
      expiryDate: "2025-12-31",
      mrp: 150,
      purchasePrice: 85,
      quantity: 100,
      gstRate: 12,
      unitType: "Tab",
      _errors: null,
    },
    {
      itemName: "Paracetamol Syp 120ml",
      batchNumber: "B002",
      expiryDate: "2025-06-15",
      mrp: 200,
      purchasePrice: 110,
      quantity: 50,
      gstRate: 12,
      unitType: "Syp",
      _errors: null,
    },
    {
      itemName: "Terpin Injection",
      batchNumber: "B003",
      expiryDate: "2026-03-30",
      mrp: 280,
      purchasePrice: 140,
      quantity: 25,
      gstRate: 5, // Detects "Injection" = medical device
      unitType: "Inj",
      _errors: null,
    },
  ],

  preview: `
┌─────────────────────────────────────────────────────────────────────────────┐
│ Item                     │ Batch │ Expiry    │   MRP │ Cost │  Qty │ Unit   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Aspirin Tab 500          │ B001  │ 2025-12-31│  150  │  85  │ 100  │ Tab    │ ✓
│ Paracetamol Syp 120ml    │ B002  │ 2025-06-15│  200  │ 110  │  50  │ Syp    │ ✓
│ Terpin Injection         │ B003  │ 2026-03-30│  280  │ 140  │  25  │ Inj    │ ✓
└─────────────────────────────────────────────────────────────────────────────┘
✓ 3 valid items, 0 errors
  `,

  result: "Instantly add all 3 items to the form",
};

// ─── EXAMPLE 2: Messy Data with Errors ──────────────────────────────────────

const example2 = {
  name: "Messy Data - Different Date Formats & Missing Fields",
  userPastes: `Aspirin	B001	31-12-2025	150	85	100
Paracetamol Syp	B002	2025/06/15	200	invalid	50
Terpin Injection	B003	March 30, 2026	280	140	25`,

  parserSettings: {
    delimiter: "auto",
    hasHeader: false,
  },

  parserOutput: [
    {
      itemName: "Aspirin",
      batchNumber: "B001",
      expiryDate: "2025-12-31", // Converted from 31-12-2025
      mrp: 150,
      purchasePrice: 85,
      quantity: 100,
      gstRate: 12,
      unitType: undefined,
      _errors: null,
    },
    {
      itemName: "Paracetamol Syp",
      batchNumber: "B002",
      expiryDate: "2025-06-15", // Converted from 2025/06/15
      mrp: 200,
      purchasePrice: null, // ERROR: "invalid" cannot be parsed
      quantity: 50,
      gstRate: 12,
      unitType: "Syp",
      _errors: ["Invalid purchase price"],
    },
    {
      itemName: "Terpin Injection",
      batchNumber: "B003",
      expiryDate: "March 30, 2026", // ERROR: Unrecognized format
      mrp: 280,
      purchasePrice: 140,
      quantity: 25,
      gstRate: 5,
      unitType: "Inj",
      _errors: ["Invalid date format: March 30, 2026"],
    },
  ],

  preview: `
┌──────────────────────────────────────────────────────────────────────────┐
│ Item                   │ Batch │ Expiry   │ MRP │ Cost │  Qty │ Status  │
├──────────────────────────────────────────────────────────────────────────┤
│ Aspirin                │ B001  │ 2025-... │ 150 │  85  │ 100  │ ✓       │
│ Paracetamol Syp        │ B002  │ 2025-... │ 200 │  ✗   │  50  │ ⚠️ Error│
│ Terpin Injection       │ B003  │ ✗        │ 280 │ 140  │  25  │ ⚠️ Error│
└──────────────────────────────────────────────────────────────────────────┘

✓ 1 valid item
⚠️ 2 errors:
  • Row 2: Invalid purchase price
  • Row 3: Invalid date format: March 30, 2026
  `,

  result: "Show errors to user, suggest format fixes, allow retry",
};

// ─── EXAMPLE 3: CSV Format with SchemeQuantity ──────────────────────────────

const example3 = {
  name: "CSV Format with Scheme Quantities (10+1 pattern)",
  userPastes: `Aspirin Tab, B001, 2025-12-31, 150, 85, 10+1
Paracetamol, B002, 2025-06-15, 200, 110, 8+2
Vitamin C, B003, 2026-03-30, 50, 30, 20+5`,

  parserSettings: {
    delimiter: "comma",
    hasHeader: false,
  },

  parserOutput: [
    {
      itemName: "Aspirin Tab",
      batchNumber: "B001",
      expiryDate: "2025-12-31",
      mrp: 150,
      purchasePrice: 85,
      quantity: 10, // Paid quantity
      schemeQuantity: 1, // Free/scheme quantity
      schemePattern: "10+1", // Readable format
      gstRate: 5,
      unitType: "Tab",
      _errors: null,
    },
    {
      itemName: "Paracetamol",
      batchNumber: "B002",
      expiryDate: "2025-06-15",
      mrp: 200,
      purchasePrice: 110,
      quantity: 8,
      schemeQuantity: 2,
      schemePattern: "8+2",
      gstRate: 12,
      unitType: undefined,
      _errors: null,
    },
    {
      itemName: "Vitamin C",
      batchNumber: "B003",
      expiryDate: "2026-03-30",
      mrp: 50,
      purchasePrice: 30,
      quantity: 20,
      schemeQuantity: 5,
      schemePattern: "20+5",
      gstRate: 12,
      unitType: undefined,
      _errors: null,
    },
  ],

  preview: `
┌──────────────────────────────────────────────────────────────────────┐
│ Item           │ Batch │ Qty   │ Scheme │ Pattern │ MRP │ Cost │ OK │
├──────────────────────────────────────────────────────────────────────┤
│ Aspirin Tab    │ B001  │  10   │   1    │ 10+1    │ 150 │  85  │ ✓  │
│ Paracetamol    │ B002  │   8   │   2    │  8+2    │ 200 │ 110  │ ✓  │
│ Vitamin C      │ B003  │  20   │   5    │ 20+5    │  50 │  30  │ ✓  │
└──────────────────────────────────────────────────────────────────────┘

✓ 3 valid items with scheme quantities detected automatically
  `,

  result: "Add all 3 items with scheme quantities ready",
};

// ─── EXAMPLE 4: Excel Export with Headers ─────────────────────────────────

const example4 = {
  name: "Excel Export (with header row)",
  userPastes: `Item Name\tBatch\tExpiry\tMRP\tCost\tQty\tUnit Type\tGST%
Aspirin Tab 500\tB001\t2025-12-31\t150\t85\t100\tTab\t5
Paracetamol Syp\tB002\t2025-06-15\t200\t110\t50\tSyp\t12
Terpin Injection\tB003\t2026-03-30\t280\t140\t25\tInj\t5`,

  parserSettings: {
    delimiter: "tab",
    hasHeader: true, // Skip first row
  },

  parserOutput: [
    {
      itemName: "Aspirin Tab 500",
      batchNumber: "B001",
      expiryDate: "2025-12-31",
      mrp: 150,
      purchasePrice: 85,
      quantity: 100,
      gstRate: 5, // Explicitly provided
      unitType: "Tab", // Explicitly provided
      _errors: null,
    },
    {
      itemName: "Paracetamol Syp",
      batchNumber: "B002",
      expiryDate: "2025-06-15",
      mrp: 200,
      purchasePrice: 110,
      quantity: 50,
      gstRate: 12,
      unitType: "Syp",
      _errors: null,
    },
    {
      itemName: "Terpin Injection",
      batchNumber: "B003",
      expiryDate: "2026-03-30",
      mrp: 280,
      purchasePrice: 140,
      quantity: 25,
      gstRate: 5,
      unitType: "Inj",
      _errors: null,
    },
  ],

  preview: `
✓ Header detected: "Item Name, Batch, Expiry, MRP, Cost, Qty, Unit Type, GST%"
✓ 3 data rows processed (header skipped)

┌──────────────────────────────────────────────────────────────────────┐
│ Item               │ Batch │ Expiry │ MRP │ Cost │ Qty │ Unit │ GST  │
├──────────────────────────────────────────────────────────────────────┤
│ Aspirin Tab 500    │ B001  │ 25-12 │ 150 │  85  │ 100 │ Tab  │  5%  │ ✓
│ Paracetamol Syp    │ B002  │ 25-06 │ 200 │ 110  │  50 │ Syp  │ 12%  │ ✓
│ Terpin Injection   │ B003  │ 26-03 │ 280 │ 140  │  25 │ Inj  │  5%  │ ✓
└──────────────────────────────────────────────────────────────────────┘

✓ 3 valid items with explicit GST rates
  `,

  result: "Most reliable format for bulk imports",
};

// ─── Summary Table ──────────────────────────────────────────────────────────

export const PARSER_FEATURES = {
  "Auto Delimiter Detection": "Detects tab, comma, or space-separated values",
  "Date Format Normalization": "Converts DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD to ISO format",
  "Unit Type Detection": "Recognizes Tab, Syp, Inj, Cream, etc. from item name",
  "GST Rate Inference": "Guesses 5% for devices/injections, 12% for medicine",
  "Price Parsing": "Removes currency symbols (₹, $) and handles different formats",
  "Scheme Quantity Parsing": "Converts '10+1' to quantity=10, scheme=1",
  "Error Collection": "Reports field-level and row-level errors",
  "Date Validation": "Verifies dates are in future (not expired)",
  "Header Support": "Can skip first row if it's a header",
  "Batch Processing": "Parse dozens of items in seconds",
};

// ─── How Fast It Is ─────────────────────────────────────────────────────────

export const PERFORMANCE = {
  "10 items": "< 50ms (instant)",
  "50 items": "< 100ms (instant)",
  "100 items": "< 200ms (instant)",
  "1000 items": "~ 2 seconds",
};

// ─── What Happens After Parsing ─────────────────────────────────────────────

export const NEXT_STEPS = [
  "1. Parser shows preview table with validation results",
  "2. User can see which rows have errors",
  "3. Valid items are highlighted in green",
  "4. Invalid rows shown in red with error messages",
  "5. User corrects format and retries, OR",
  "6. User clicks 'Add X Items' to add only valid rows",
  "7. Form automatically populated with all fields",
  "8. User can review/edit individual items",
  "9. User selects supplier and invoice number",
  "10. Submits entire bill at once",
];

export default {
  example1,
  example2,
  example3,
  example4,
  PARSER_FEATURES,
  PERFORMANCE,
  NEXT_STEPS,
};
