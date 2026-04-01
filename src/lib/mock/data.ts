import { Batch, Customer, Supplier, Invoice, SupplierBill, Payment, UnitType } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const mockSuppliers: Supplier[] = [
  { id: "sup-1", name: "MedLine Distributors", phone: "9876543210", email: "orders@medline.com", createdAt: "2025-01-10T00:00:00Z" },
  { id: "sup-2", name: "PharmaLink Pvt Ltd", phone: "9123456780", email: "supply@pharmalink.com", createdAt: "2025-02-01T00:00:00Z" },
  { id: "sup-3", name: "HealthBridge Corp", phone: "9000011122", email: "info@healthbridge.com", createdAt: "2025-03-15T00:00:00Z" },
];

// ─── Batches ──────────────────────────────────────────────────────────────────

const rawBatches: Array<Omit<Batch, "status">> = [
  { id: "bat-1",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2024-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-001", expiryDate: "2025-01-15", mrp: 25,  purchasePrice: 18,  availableQty: 0,   originalQty: 200,  unitType: "Tab",  packSize: 10, createdAt: "2025-01-05T00:00:00Z" },
  { id: "bat-2",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2025-B", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-002", expiryDate: "2026-06-30", mrp: 25,  purchasePrice: 18,  availableQty: 180, originalQty: 200,  unitType: "Tab",  packSize: 10, createdAt: "2025-03-10T00:00:00Z" },
  { id: "bat-3",  tenantId: "demo", itemName: "Paracetamol 500mg",  batchNumber: "PCM-2025-C", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-010", expiryDate: "2026-04-20", mrp: 25,  purchasePrice: 17,  availableQty: 80,  originalQty: 100,  unitType: "Tab",  packSize: 10, createdAt: "2025-06-01T00:00:00Z" },
  { id: "bat-4",  tenantId: "demo", itemName: "Amoxicillin 250mg",  batchNumber: "AMX-2025-A", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-003", expiryDate: "2026-05-15", mrp: 60,  purchasePrice: 42,  availableQty: 150, originalQty: 200,  unitType: "Cap",  packSize: 10, createdAt: "2025-02-15T00:00:00Z" },
  { id: "bat-5",  tenantId: "demo", itemName: "Amoxicillin 250mg",  batchNumber: "AMX-2025-B", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-012", expiryDate: "2026-07-01", mrp: 60,  purchasePrice: 43,  availableQty: 200, originalQty: 200,  unitType: "Cap",  packSize: 10, createdAt: "2025-07-10T00:00:00Z" },
  { id: "bat-6",  tenantId: "demo", itemName: "Ibuprofen 400mg",    batchNumber: "IBU-2025-A", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-005", expiryDate: "2025-12-31", mrp: 35,  purchasePrice: 24,  availableQty: 60,  originalQty: 100,  unitType: "Tab",  packSize: 15, createdAt: "2024-12-20T00:00:00Z" },
  { id: "bat-7",  tenantId: "demo", itemName: "Ibuprofen 400mg",    batchNumber: "IBU-2026-B", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-015", expiryDate: "2027-03-31", mrp: 35,  purchasePrice: 25,  availableQty: 300, originalQty: 300,  unitType: "Tab",  packSize: 15, createdAt: "2026-01-05T00:00:00Z" },
  { id: "bat-8",  tenantId: "demo", itemName: "Metformin 500mg",    batchNumber: "MET-2025-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-006", expiryDate: "2026-09-30", mrp: 45,  purchasePrice: 30,  availableQty: 400, originalQty: 500,  unitType: "SR Tab", packSize: 10, createdAt: "2025-09-01T00:00:00Z" },
  { id: "bat-9",  tenantId: "demo", itemName: "Cetirizine 10mg",    batchNumber: "CET-2025-A", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-007", expiryDate: "2026-06-15", mrp: 20,  purchasePrice: 12,  availableQty: 250, originalQty: 300,  unitType: "Tab",  packSize: 10, createdAt: "2025-06-15T00:00:00Z" },
  { id: "bat-10", tenantId: "demo", itemName: "Vitamin C 500mg",    batchNumber: "VTC-2026-A", supplierId: "sup-3", supplierName: "HealthBridge Corp",     invoiceNumber: "INV-016", expiryDate: "2027-06-30", mrp: 80,  purchasePrice: 55,  availableQty: 500, originalQty: 500,  unitType: "Chew Tab", packSize: 15, createdAt: "2026-01-20T00:00:00Z" },
  { id: "bat-11", tenantId: "demo", itemName: "Atorvastatin 10mg",  batchNumber: "ATV-2024-A", supplierId: "sup-1", supplierName: "MedLine Distributors", invoiceNumber: "INV-008", expiryDate: "2025-06-30", mrp: 120, purchasePrice: 85,  availableQty: 20,  originalQty: 200,  unitType: "Tab",  packSize: 10, createdAt: "2024-06-01T00:00:00Z" },
  { id: "bat-12", tenantId: "demo", itemName: "Atorvastatin 10mg",  batchNumber: "ATV-2026-B", supplierId: "sup-2", supplierName: "PharmaLink Pvt Ltd",   invoiceNumber: "INV-017", expiryDate: "2028-01-31", mrp: 120, purchasePrice: 88,  availableQty: 300, originalQty: 300,  unitType: "Tab",  packSize: 10, createdAt: "2026-02-01T00:00:00Z" },
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
      { batchId: "bat-2", itemName: "Paracetamol 500mg", hsnCode: "3004", batchNumber: "PCM-2025-B", expiryDate: "2026-06-30", mrp: 25, quantity: 100, discountType: "percentage", discountValue: 5, lineTotal: 2375, gstRate: 12, taxableAmount: 2375, cgst: 142.5, sgst: 142.5, gstAmount: 285, lineTotalWithGst: 2660 },
      { batchId: "bat-4", itemName: "Amoxicillin 250mg", hsnCode: "3004", batchNumber: "AMX-2025-A", expiryDate: "2026-05-15", mrp: 60, quantity: 50, discountType: undefined, discountValue: undefined, lineTotal: 3000, gstRate: 12, taxableAmount: 3000, cgst: 180, sgst: 180, gstAmount: 360, lineTotalWithGst: 3360 },
    ],
    customerDiscountType: "percentage",
    customerDiscountValue: 5,
    subtotal: 5375,
    customerDiscountAmount: 268.75,
    taxableAmount: 5106.25,
    totalGst: 645,
    grandTotal: 5751.25,
    paymentStatus: "paid",
    paidAmount: 5751.25,
    dueDate: "2026-03-15",
    createdAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "inv-2",
    tenantId: "demo",
    customerId: "cus-2",
    customerName: "HealthPlus Clinic",
    lineItems: [
      { batchId: "bat-8", itemName: "Metformin 500mg", hsnCode: "3004", batchNumber: "MET-2025-A", expiryDate: "2026-09-30", mrp: 45, quantity: 200, discountType: "percentage", discountValue: 8, lineTotal: 8280, gstRate: 12, taxableAmount: 8280, cgst: 496.8, sgst: 496.8, gstAmount: 993.6, lineTotalWithGst: 9273.6 },
      { batchId: "bat-9", itemName: "Cetirizine 10mg", hsnCode: "3004", batchNumber: "CET-2025-A", expiryDate: "2026-06-15", mrp: 20, quantity: 100, lineTotal: 2000, gstRate: 12, taxableAmount: 2000, cgst: 120, sgst: 120, gstAmount: 240, lineTotalWithGst: 2240 },
    ],
    customerDiscountType: "flat",
    customerDiscountValue: 50,
    subtotal: 10280,
    customerDiscountAmount: 50,
    taxableAmount: 10230,
    totalGst: 1233.6,
    grandTotal: 11513.6,
    paymentStatus: "partial",
    paidAmount: 6000,
    dueDate: "2026-04-05",
    createdAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "inv-3",
    tenantId: "demo",
    customerId: "cus-3",
    customerName: "MediCare Hospital",
    lineItems: [
      { batchId: "bat-7", itemName: "Ibuprofen 400mg", hsnCode: "3004", batchNumber: "IBU-2026-B", expiryDate: "2027-03-31", mrp: 35, quantity: 500, discountType: "percentage", discountValue: 10, lineTotal: 15750, gstRate: 12, taxableAmount: 15750, cgst: 945, sgst: 945, gstAmount: 1890, lineTotalWithGst: 17640 },
      { batchId: "bat-10", itemName: "Vitamin C 500mg", hsnCode: "3004", batchNumber: "VTC-2026-A", expiryDate: "2027-06-30", mrp: 80, quantity: 100, discountType: "percentage", discountValue: 10, lineTotal: 7200, gstRate: 5, taxableAmount: 7200, cgst: 180, sgst: 180, gstAmount: 360, lineTotalWithGst: 7560 },
    ],
    customerDiscountType: "percentage",
    customerDiscountValue: 10,
    subtotal: 22950,
    customerDiscountAmount: 2295,
    taxableAmount: 20655,
    totalGst: 2250,
    grandTotal: 22905,
    paymentStatus: "unpaid",
    paidAmount: 0,
    dueDate: "2026-04-10",
    createdAt: "2026-03-15T14:00:00Z",
  },
  {
    id: "inv-4",
    tenantId: "demo",
    customerId: "cus-1",
    customerName: "City Pharmacy",
    lineItems: [
      { batchId: "bat-12", itemName: "Atorvastatin 10mg", hsnCode: "3004", batchNumber: "ATV-2026-B", expiryDate: "2028-01-31", mrp: 120, quantity: 60, discountType: "percentage", discountValue: 5, lineTotal: 6840, gstRate: 12, taxableAmount: 6840, cgst: 410.4, sgst: 410.4, gstAmount: 820.8, lineTotalWithGst: 7660.8 },
    ],
    subtotal: 6840,
    customerDiscountAmount: 0,
    taxableAmount: 6840,
    totalGst: 820.8,
    grandTotal: 7660.8,
    paymentStatus: "paid",
    paidAmount: 7660.8,
    dueDate: "2026-04-15",
    createdAt: "2026-03-20T11:30:00Z",
  },
  {
    id: "inv-5",
    tenantId: "demo",
    customerId: "cus-4",
    customerName: "Corner Drug Store",
    lineItems: [
      { batchId: "bat-5", itemName: "Amoxicillin 250mg", hsnCode: "3004", batchNumber: "AMX-2025-B", expiryDate: "2026-07-01", mrp: 60, quantity: 80, lineTotal: 4800, gstRate: 12, taxableAmount: 4800, cgst: 288, sgst: 288, gstAmount: 576, lineTotalWithGst: 5376 },
    ],
    subtotal: 4800,
    customerDiscountAmount: 0,
    taxableAmount: 4800,
    totalGst: 576,
    grandTotal: 5376,
    paymentStatus: "unpaid",
    paidAmount: 0,
    dueDate: "2026-04-25",
    createdAt: "2026-03-25T16:00:00Z",
  },
];

// ─── Supplier Bills (Purchase Register / GRN) ─────────────────────────────────

export const mockSupplierBills: SupplierBill[] = [
  {
    id: "sbill-1",
    tenantId: "demo",
    supplierId: "sup-1",
    supplierName: "MedLine Distributors",
    invoiceNumber: "ML-INV-2025-001",
    date: "2025-01-05",
    items: [
      { itemName: "Paracetamol 500mg", hsnCode: "3004", batchNumber: "PCM-2024-A", expiryDate: "2025-01-15", mrp: 25, purchasePrice: 18, quantity: 200, gstRate: 12, taxableAmount: 3600, cgst: 216, sgst: 216, lineTotal: 4032 },
      { itemName: "Paracetamol 500mg", hsnCode: "3004", batchNumber: "PCM-2025-B", expiryDate: "2026-06-30", mrp: 25, purchasePrice: 18, quantity: 200, gstRate: 12, taxableAmount: 3600, cgst: 216, sgst: 216, lineTotal: 4032 },
    ],
    taxableAmount: 7200,
    totalGst: 864,
    grandTotal: 8064,
    paymentStatus: "paid",
    paidAmount: 8064,
    dueDate: "2025-02-05",
    createdAt: "2025-01-05T00:00:00Z",
  },
  {
    id: "sbill-2",
    tenantId: "demo",
    supplierId: "sup-2",
    supplierName: "PharmaLink Pvt Ltd",
    invoiceNumber: "PL-INV-2025-003",
    date: "2025-02-15",
    items: [
      { itemName: "Amoxicillin 250mg", hsnCode: "3004", batchNumber: "AMX-2025-A", expiryDate: "2026-05-15", mrp: 60, purchasePrice: 42, quantity: 200, gstRate: 12, taxableAmount: 8400, cgst: 504, sgst: 504, lineTotal: 9408 },
    ],
    taxableAmount: 8400,
    totalGst: 1008,
    grandTotal: 9408,
    paymentStatus: "paid",
    paidAmount: 9408,
    dueDate: "2025-03-15",
    createdAt: "2025-02-15T00:00:00Z",
  },
  {
    id: "sbill-3",
    tenantId: "demo",
    supplierId: "sup-3",
    supplierName: "HealthBridge Corp",
    invoiceNumber: "HB-INV-2026-015",
    date: "2026-01-05",
    items: [
      { itemName: "Ibuprofen 400mg", hsnCode: "3004", batchNumber: "IBU-2026-B", expiryDate: "2027-03-31", mrp: 35, purchasePrice: 25, quantity: 300, gstRate: 12, taxableAmount: 7500, cgst: 450, sgst: 450, lineTotal: 8400 },
      { itemName: "Vitamin C 500mg", hsnCode: "3004", batchNumber: "VTC-2026-A", expiryDate: "2027-06-30", mrp: 80, purchasePrice: 55, quantity: 500, gstRate: 5, taxableAmount: 27500, cgst: 687.5, sgst: 687.5, lineTotal: 28875 },
    ],
    taxableAmount: 35000,
    totalGst: 3825,
    grandTotal: 38825,
    paymentStatus: "partial",
    paidAmount: 20000,
    dueDate: "2026-02-05",
    createdAt: "2026-01-05T00:00:00Z",
  },
  {
    id: "sbill-4",
    tenantId: "demo",
    supplierId: "sup-1",
    supplierName: "MedLine Distributors",
    invoiceNumber: "ML-INV-2026-012",
    date: "2026-02-01",
    items: [
      { itemName: "Atorvastatin 10mg", hsnCode: "3004", batchNumber: "ATV-2026-B", expiryDate: "2028-01-31", mrp: 120, purchasePrice: 88, quantity: 300, gstRate: 12, taxableAmount: 26400, cgst: 1584, sgst: 1584, lineTotal: 29568 },
    ],
    taxableAmount: 26400,
    totalGst: 3168,
    grandTotal: 29568,
    paymentStatus: "unpaid",
    paidAmount: 0,
    dueDate: "2026-03-01",
    createdAt: "2026-02-01T00:00:00Z",
  },
];

// ─── Payments ─────────────────────────────────────────────────────────────────

export const mockPayments: Payment[] = [
  { id: "pay-1", tenantId: "demo", partyId: "cus-1", partyType: "customer", invoiceId: "inv-1", amount: 5751.25, date: "2026-03-03", mode: "upi", reference: "UPI-3324", createdAt: "2026-03-03T10:00:00Z" },
  { id: "pay-2", tenantId: "demo", partyId: "cus-2", partyType: "customer", invoiceId: "inv-2", amount: 6000, date: "2026-03-12", mode: "bank", reference: "NEFT-7756", createdAt: "2026-03-12T10:00:00Z" },
  { id: "pay-3", tenantId: "demo", partyId: "cus-1", partyType: "customer", invoiceId: "inv-4", amount: 7660.8, date: "2026-03-22", mode: "cash", createdAt: "2026-03-22T10:00:00Z" },
  { id: "pay-4", tenantId: "demo", partyId: "sup-1", partyType: "supplier", invoiceId: "sbill-1", amount: 8064, date: "2025-01-25", mode: "bank", reference: "NEFT-1012", createdAt: "2025-01-25T00:00:00Z" },
  { id: "pay-5", tenantId: "demo", partyId: "sup-2", partyType: "supplier", invoiceId: "sbill-2", amount: 9408, date: "2025-03-10", mode: "bank", reference: "NEFT-1089", createdAt: "2025-03-10T00:00:00Z" },
  { id: "pay-6", tenantId: "demo", partyId: "sup-3", partyType: "supplier", invoiceId: "sbill-3", amount: 20000, date: "2026-01-20", mode: "cheque", reference: "CHQ-990", createdAt: "2026-01-20T00:00:00Z" },
];
