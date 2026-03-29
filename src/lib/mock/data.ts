import { Batch, Customer, Supplier, Invoice } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const mockSuppliers: Supplier[] = [
  { id: "sup-1", name: "MedLine Distributors", phone: "9876543210", email: "orders@medline.com", createdAt: "2025-01-10T00:00:00Z" },
  { id: "sup-2", name: "PharmaLink Pvt Ltd", phone: "9123456780", email: "supply@pharmalink.com", createdAt: "2025-02-01T00:00:00Z" },
  { id: "sup-3", name: "HealthBridge Corp", phone: "9000011122", email: "info@healthbridge.com", createdAt: "2025-03-15T00:00:00Z" },
];

// ─── Batches ──────────────────────────────────────────────────────────────────

const rawBatches = [
  { id: "bat-1",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2024-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-001", expiryDate: "2025-01-15", mrp: 25,  purchasePrice: 18,  availableQty: 0,   originalQty: 200,  createdAt: "2025-01-05T00:00:00Z" },
  { id: "bat-2",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2025-B", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-002", expiryDate: "2026-06-30", mrp: 25,  purchasePrice: 18,  availableQty: 180, originalQty: 200,  createdAt: "2025-03-10T00:00:00Z" },
  { id: "bat-3",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2025-C", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-010", expiryDate: "2026-04-20", mrp: 25,  purchasePrice: 17,  availableQty: 80,  originalQty: 100,  createdAt: "2025-06-01T00:00:00Z" },
  { id: "bat-4",  tenantId: "demo", itemName: "Amoxicillin 250mg",  batchNumber: "AMX-2025-A", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-003", expiryDate: "2026-05-15", mrp: 60,  purchasePrice: 42,  availableQty: 150, originalQty: 200,  createdAt: "2025-02-15T00:00:00Z" },
  { id: "bat-5",  tenantId: "demo", itemName: "Amoxicillin 250mg",  batchNumber: "AMX-2025-B", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-012", expiryDate: "2026-07-01", mrp: 60,  purchasePrice: 43,  availableQty: 200, originalQty: 200,  createdAt: "2025-07-10T00:00:00Z" },
  { id: "bat-6",  tenantId: "demo", itemName: "Ibuprofen 400mg",    batchNumber: "IBU-2025-A", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-005", expiryDate: "2025-12-31", mrp: 35,  purchasePrice: 24,  availableQty: 60,  originalQty: 100,  createdAt: "2024-12-20T00:00:00Z" },
  { id: "bat-7",  tenantId: "demo", itemName: "Ibuprofen 400mg",    batchNumber: "IBU-2026-B", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-015", expiryDate: "2027-03-31", mrp: 35,  purchasePrice: 25,  availableQty: 300, originalQty: 300,  createdAt: "2026-01-05T00:00:00Z" },
  { id: "bat-8",  tenantId: "demo", itemName: "Metformin 500mg",    batchNumber: "MET-2025-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-006", expiryDate: "2026-09-30", mrp: 45,  purchasePrice: 30,  availableQty: 400, originalQty: 500,  createdAt: "2025-09-01T00:00:00Z" },
  { id: "bat-9",  tenantId: "demo", itemName: "Cetirizine 10mg",    batchNumber: "CET-2025-A", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-007", expiryDate: "2026-06-15", mrp: 20,  purchasePrice: 12,  availableQty: 250, originalQty: 300,  createdAt: "2025-06-15T00:00:00Z" },
  { id: "bat-10", tenantId: "demo", itemName: "Vitamin C 500mg",    batchNumber: "VTC-2026-A", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-016", expiryDate: "2027-06-30", mrp: 80,  purchasePrice: 55,  availableQty: 500, originalQty: 500,  createdAt: "2026-01-20T00:00:00Z" },
  { id: "bat-11", tenantId: "demo", itemName: "Atorvastatin 10mg",  batchNumber: "ATV-2024-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-008", expiryDate: "2025-06-30", mrp: 120, purchasePrice: 85,  availableQty: 20,  originalQty: 200,  createdAt: "2024-06-01T00:00:00Z" },
  { id: "bat-12", tenantId: "demo", itemName: "Atorvastatin 10mg",  batchNumber: "ATV-2026-B", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-017", expiryDate: "2028-01-31", mrp: 120, purchasePrice: 88,  availableQty: 300, originalQty: 300,  createdAt: "2026-02-01T00:00:00Z" },
];

export const mockBatches: Batch[] = rawBatches.map((b) => ({
  ...b,
  status: getInventoryStatus(b.expiryDate),
}));

// ─── Customers ────────────────────────────────────────────────────────────────

export const mockCustomers: Customer[] = [
  { id: "cus-1", tenantId: "demo", name: "City Pharmacy",      phone: "9811122233", discount: { type: "percentage", value: 5  }, createdAt: "2025-01-01T00:00:00Z" },
  { id: "cus-2", tenantId: "demo", name: "HealthPlus Clinic",  phone: "9822233344", discount: { type: "flat",       value: 50 }, createdAt: "2025-02-10T00:00:00Z" },
  { id: "cus-3", tenantId: "demo", name: "MediCare Hospital",  phone: "9833344455", discount: { type: "percentage", value: 10 }, createdAt: "2025-03-05T00:00:00Z" },
  { id: "cus-4", tenantId: "demo", name: "Corner Drug Store",  phone: "9844455566", discount: undefined,                         createdAt: "2025-04-20T00:00:00Z" },
];

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const mockInvoices: Invoice[] = [
  {
    id: "inv-1",
    tenantId: "demo",
    customerId: "cus-1",
    customerName: "City Pharmacy",
    lineItems: [
      { batchId: "bat-2", itemName: "Paracetamol 500mg", batchNumber: "PCM-2025-B", expiryDate: "2026-06-30", mrp: 25, quantity: 10, discountType: "percentage", discountValue: 5, lineTotal: 237.5 },
      { batchId: "bat-4", itemName: "Amoxicillin 250mg", batchNumber: "AMX-2025-A", expiryDate: "2026-05-15", mrp: 60, quantity: 5,  discountType: undefined,      discountValue: undefined, lineTotal: 300 },
    ],
    customerDiscountType: "percentage",
    customerDiscountValue: 5,
    subtotal: 537.5,
    customerDiscountAmount: 26.875,
    grandTotal: 510.625,
    createdAt: "2026-03-01T10:00:00Z",
  },
];
