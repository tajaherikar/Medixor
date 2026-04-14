/**
 * Integration Guide: Adding Bulk Parser to Supplier Bill Form
 * 
 * This shows how to integrate the BulkImportItemsDialog into the SupplierBillForm
 */

// ─── Step 1: Add imports to supplier-bill-form.tsx ─────────────────────────────

/*
import { BulkImportDialog } from "@/components/bulk-import-items-dialog";
import { ParsedItem } from "@/lib/bulk-item-parser";
*/

// ─── Step 2: Add state for bulk import dialog ────────────────────────────────

/*
export function SupplierBillForm({ tenant, onSuccess, billId, initialBill }: SupplierBillFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);  // ← ADD THIS
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  // ... rest of state
*/

// ─── Step 3: Add handler to process bulk items ─────────────────────────────

/*
const handleBulkAddItems = (parsedItems: ParsedItem[]) => {
  // Get current items count
  const currentLength = fields.length;
  
  // Get the empty item count (usually 1 by default)
  const hasEmptyItem = fields[0]?.itemName === "" ?? false;
  
  // Remove first empty item if it exists
  if (hasEmptyItem && currentLength === 1) {
    remove(0);
  }
  
  // Map parsed items to form structure
  const itemsToAdd = parsedItems.map(item => ({
    itemName: item.itemName || "",
    hsnCode: item.hsnCode || "",
    batchNumber: item.batchNumber || "",
    expiryDate: item.expiryDate || "",
    mrp: item.mrp || 0,
    purchasePrice: item.purchasePrice || 0,
    quantity: item.quantity || 0,
    gstRate: item.gstRate || 12,
    gstInclusive: false,
    unitType: item.unitType || "",
    packSize: item.packSize || undefined,
    schemeQuantity: item.schemeQuantity || 0,
    schemePattern: item.schemePattern || "",
  }));
  
  // Add all items at once
  itemsToAdd.forEach(item => append(item));
  
  // Optionally scroll to the items section
  setTimeout(() => {
    const itemsSection = document.getElementById("items-section");
    itemsSection?.scrollIntoView({ behavior: "smooth" });
  }, 100);
};
*/

// ─── Step 4: Add button to trigger bulk import ──────────────────────────────

/*
In your JSX, near the "Add Item" button:

<div className="flex gap-2">
  <Button 
    type="button" 
    onClick={() => append(emptyItem)}
    className="gap-2"
  >
    <Plus className="h-4 w-4" />
    Add Item
  </Button>
  
  <Button 
    type="button" 
    onClick={() => setShowBulkImport(true)}
    variant="outline"
    className="gap-2"
  >
    <Copy className="h-4 w-4" />
    Bulk Import
  </Button>
</div>
*/

// ─── Step 5: Add the dialog component ────────────────────────────────────────

/*
{/* Bulk Import Dialog */}
{/*
<BulkImportDialog
  open={showBulkImport}
  onOpenChange={setShowBulkImport}
  onAddItems={handleBulkAddItems}
  title="Bulk Import Items from Invoice"
/>
*/}

// ─── Full Example Usage ──────────────────────────────────────────────────────

export const SUPPLIER_BILL_FORM_INTEGRATION = `
// Add to imports
import { BulkImportDialog } from "@/components/bulk-import-items-dialog";

export function SupplierBillForm({ tenant, onSuccess, billId, initialBill }: SupplierBillFormProps) {
  // ... existing state ...
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Handler for bulk items
  const handleBulkAddItems = (parsedItems: ParsedItem[]) => {
    const currentLength = fields.length;
    const hasEmptyItem = fields[0]?.itemName === "";
    
    if (hasEmptyItem && currentLength === 1) {
      remove(0);
    }
    
    const itemsToAdd = parsedItems.map(item => ({
      itemName: item.itemName || "",
      hsnCode: item.hsnCode || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
      mrp: item.mrp || 0,
      purchasePrice: item.purchasePrice || 0,
      quantity: item.quantity || 0,
      gstRate: item.gstRate || 12,
      gstInclusive: false,
      unitType: item.unitType || "",
      packSize: item.packSize || undefined,
      schemeQuantity: item.schemeQuantity || 0,
      schemePattern: item.schemePattern || "",
    }));
    
    itemsToAdd.forEach(item => append(item));
  };
  
  return (
    <>
      {/* Existing form JSX */}
      
      <div className="flex gap-2">
        <Button type="button" onClick={() => append(emptyItem)}>
          Add Item
        </Button>
        <Button 
          type="button" 
          variant="outline"
          onClick={() => setShowBulkImport(true)}
        >
          Bulk Import
        </Button>
      </div>
      
      {/* Items list */}
      <div id="items-section">
        {/* existing items rendering */}
      </div>
      
      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onAddItems={handleBulkAddItems}
        title="Bulk Import Items from Invoice"
      />
    </>
  );
}
`;

// ─── Example: What user can paste ───────────────────────────────────────────

export const USER_PASTE_EXAMPLES = {
  directFromExcel: \`Aspirin Tab 500	B001	2025-12-31	150	85	100	Tab
Paracetamol Syp 120ml	B002	2025-06-15	200	110	50	Syp
Terpin Injection	B003	2026-03-30	280	140	25	Inj\`,

  fromPhoneBill: \`Aspirin, B001, 31-12-2025, 150, 85, 100
Paracetamol, B002, 15-06-2025, 200, 110, 50
Terpin, B003, 30-03-2026, 280, 140, 25\`,

  withHeaders: \`Item Name	Batch	Expiry	MRP	Cost	Qty	Unit
Aspirin Tab	B001	2025-12-31	150	85	100	Tab
Paracetamol Syp	B002	2025-06-15	200	110	50	Syp
Terpin Inj	B003	2026-03-30	280	140	25	Inj\`,

  withScheme: \`Aspirin Tab	B001	2025-12-31	150	85	10+1	Tab
Paracetamol	B002	2025-06-15	200	110	8+2	Syp
Vitamin C	B003	2026-03-30	50	30	20+5	Tab\`,
};

// ─── How to test in browser console ─────────────────────────────────────────

export const BROWSER_TEST = \`
// In browser console (F12), run:
testBulkParser()

// This will show:
// - Perfect data parsing
// - Messy data with errors
// - Different date format handling
// - All logged in console table format
\`;
