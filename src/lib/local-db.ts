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
  Doctor,
  AppUser,
  BusinessSettings,
  defaultBusinessSettings,
} from "@/lib/types";
import {
  mockBatches,
  mockCustomers,
  mockSuppliers,
  mockInvoices,
  mockSupplierBills,
  mockPayments,
  mockUsers,
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
  doctors:       "medixor-db-doctors",
  users:         "medixor-db-users",
  settings:      "medixor-db-settings",
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
  write(KEYS.doctors,       []);
  write(KEYS.users,         mockUsers);
  write(KEYS.settings,      [{ tenantId: 'default', ...defaultBusinessSettings }]);

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
  updateSupplier: (id: string, updates: Partial<Supplier>): void => {
    const list = read<Supplier>(KEYS.suppliers).map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
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
  updateCustomer: (id: string, updates: Partial<Customer>): void => {
    const list = read<Customer>(KEYS.customers).map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
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

  // ── Doctors ────────────────────────────────────────────────────────────────
  getDoctors: (): Doctor[] => {
    seed();
    return read<Doctor>(KEYS.doctors);
  },
  addDoctor: (d: Doctor): void => {
    const list = localDb.getDoctors();
    list.push(d);
    write(KEYS.doctors, list);
  },
  updateDoctor: (id: string, updates: Partial<Doctor>): void => {
    const list = read<Doctor>(KEYS.doctors).map((d) =>
      d.id === id ? { ...d, ...updates } : d
    );
    write(KEYS.doctors, list);
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers: (tenantId?: string): AppUser[] => {
    seed();
    const list = read<AppUser>(KEYS.users);
    if (tenantId) return list.filter((u) => u.tenantId === tenantId);
    return list;
  },
  getUserByEmailAnyTenant: (email: string): AppUser | null => {
    seed();
    const list = read<AppUser>(KEYS.users);
    return list.find((u) => u.email === email) || null;
  },
  addUser: (u: AppUser): void => {
    const list = read<AppUser>(KEYS.users);
    const exists = list.some((existing) => existing.id === u.id);
    if (!exists) {
      list.push(u);
      write(KEYS.users, list);
    }
  },
  updateUser: (id: string, updates: Partial<Omit<AppUser, "id">>): void => {
    const list = read<AppUser>(KEYS.users).map((u) =>
      u.id === id ? { ...u, ...updates } : u
    );
    write(KEYS.users, list);
  },
  deleteUser: (id: string): void => {
    const list = read<AppUser>(KEYS.users).filter((u) => u.id !== id);
    write(KEYS.users, list);
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: (tenantId: string): BusinessSettings => {
    seed();
    const list = read<{ tenantId: string; } & BusinessSettings>(KEYS.settings);
    const found = list.find((s) => s.tenantId === tenantId);
    return found ? { ...found } : defaultBusinessSettings;
  },
  saveSettings: (tenantId: string, settings: BusinessSettings): void => {
    const list = read<{ tenantId: string; } & BusinessSettings>(KEYS.settings);
    const index = list.findIndex((s) => s.tenantId === tenantId);
    if (index >= 0) {
      list[index] = { tenantId, ...settings };
    } else {
      list.push({ tenantId, ...settings });
    }
    write(KEYS.settings, list);
  },

  // ── Reset (dev utility) ────────────────────────────────────────────────────
  reset: (): void => {
    if (typeof window === "undefined") return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    seed();
  },
};
