/**
 * local-db.ts
 * -----------
 * A thin localStorage-backed "database" for all Medixor collections.
 *
 * On first load each collection is seeded with the mock data so the app
 * works immediately. Any additions/changes are persisted across reloads.
 *
 * To reset everything back to seed data, call `localDb.reset()` or run:
 *   localStorage.removeItem("medixor-db-seeded")
 * in the browser console and reload.
 *
 * Easy to swap for a real API later — just replace the handlers.ts reads/writes.
 */

import {
  Batch,
  Customer,
  Supplier,
  Invoice,
  SupplierBill,
  Payment,
} from "@/lib/types";
import {
  mockBatches,
  mockCustomers,
  mockSuppliers,
  mockInvoices,
  mockSupplierBills,
  mockPayments,
} from "@/lib/mock/data";
import { getInventoryStatus } from "@/lib/batch-logic";

// ─── Keys ─────────────────────────────────────────────────────────────────────

const KEYS = {
  seeded:        "medixor-db-seeded",
  suppliers:     "medixor-db-suppliers",
  batches:       "medixor-db-batches",
  customers:     "medixor-db-customers",
  invoices:      "medixor-db-invoices",
  supplierBills: "medixor-db-supplier-bills",
  payments:      "medixor-db-payments",
} as const;

// ─── Core helpers ─────────────────────────────────────────────────────────────

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

function seed(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEYS.seeded)) return; // already seeded

  write(KEYS.suppliers,     mockSuppliers);
  write(KEYS.batches,       mockBatches);
  write(KEYS.customers,     mockCustomers);
  write(KEYS.invoices,      mockInvoices);
  write(KEYS.supplierBills, mockSupplierBills);
  write(KEYS.payments,      mockPayments);

  localStorage.setItem(KEYS.seeded, "1");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const localDb = {
  // ── Suppliers ──────────────────────────────────────────────────────────────
  getSuppliers: (): Supplier[] => {
    seed();
    return read<Supplier>(KEYS.suppliers);
  },
  addSupplier: (s: Supplier): void => {
    const list = localDb.getSuppliers();
    list.push(s);
    write(KEYS.suppliers, list);
  },

  // ── Batches / Inventory ────────────────────────────────────────────────────
  getBatches: (): Batch[] => {
    seed();
    return read<Batch>(KEYS.batches).map((b) => ({
      ...b,
      status: getInventoryStatus(b.expiryDate),
    }));
  },
  addBatch: (b: Batch): void => {
    const list = read<Batch>(KEYS.batches);
    list.push(b);
    write(KEYS.batches, list);
  },
  updateBatch: (id: string, updates: Partial<Batch>): void => {
    const list = read<Batch>(KEYS.batches).map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    write(KEYS.batches, list);
  },

  // ── Customers ──────────────────────────────────────────────────────────────
  getCustomers: (): Customer[] => {
    seed();
    return read<Customer>(KEYS.customers);
  },
  addCustomer: (c: Customer): void => {
    const list = localDb.getCustomers();
    list.push(c);
    write(KEYS.customers, list);
  },

  // ── Invoices ───────────────────────────────────────────────────────────────
  getInvoices: (): Invoice[] => {
    seed();
    return read<Invoice>(KEYS.invoices);
  },
  addInvoice: (inv: Invoice): void => {
    const list = localDb.getInvoices();
    list.push(inv);
    write(KEYS.invoices, list);
  },
  updateInvoice: (id: string, updates: Partial<Invoice>): void => {
    const list = read<Invoice>(KEYS.invoices).map((inv) =>
      inv.id === id ? { ...inv, ...updates } : inv
    );
    write(KEYS.invoices, list);
  },

  // ── Supplier Bills ─────────────────────────────────────────────────────────
  getSupplierBills: (): SupplierBill[] => {
    seed();
    return read<SupplierBill>(KEYS.supplierBills);
  },
  addSupplierBill: (bill: SupplierBill): void => {
    const list = localDb.getSupplierBills();
    list.push(bill);
    write(KEYS.supplierBills, list);
  },
  updateSupplierBill: (id: string, updates: Partial<SupplierBill>): void => {
    const list = read<SupplierBill>(KEYS.supplierBills).map((b) =>
      b.id === id ? { ...b, ...updates } : b
    );
    write(KEYS.supplierBills, list);
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  getPayments: (): Payment[] => {
    seed();
    return read<Payment>(KEYS.payments);
  },
  addPayment: (p: Payment): void => {
    const list = localDb.getPayments();
    list.push(p);
    write(KEYS.payments, list);
  },

  // ── Reset (dev utility) ────────────────────────────────────────────────────
  reset: (): void => {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seed();
  },
};
