/**
 * db-hybrid.ts
 * Offline-first database layer that uses local-db when offline,
 * syncs to Supabase when online.
 */

import { localDb } from "@/lib/local-db";
import * as cloudDb from "@/lib/db-cloud";
import type {
  Batch,
  BusinessSettings,
  Customer,
  Doctor,
  Supplier,
  Invoice,
  SupplierBill,
  Payment,
  AppUser,
} from "@/lib/types";

// Check if we're in Electron or online
function isOnline(): boolean {
  if (typeof window !== 'undefined') {
    return navigator.onLine;
  }
  // Server-side: always try cloud first
  return true;
}

function isElectron(): boolean {
  if (typeof window !== 'undefined') {
    // Check for our preload-injected flag
    return !!(window as any).electron?.isElectron;
  }
  // Server-side check
  return process.versions?.electron !== undefined;
}

// Use local-db for Electron OR when offline
function useLocal(): boolean {
  return isElectron() || !isOnline();
}

// Wrapper functions that route to local or cloud

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(tenantId: string): Promise<Supplier[]> {
  if (useLocal()) return localDb.getSuppliers();
  try {
    return await cloudDb.getSuppliers(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getSuppliers();
  }
}

export async function addSupplier(s: Supplier): Promise<void> {
  if (useLocal()) return localDb.addSupplier(s);
  try {
    await cloudDb.addSupplier(s);
    // Also save locally for offline cache
    localDb.addSupplier(s);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addSupplier(s);
  }
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  if (useLocal()) return localDb.updateSupplier(id, updates);
  try {
    await cloudDb.updateSupplier(id, updates);
    localDb.updateSupplier(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateSupplier(id, updates);
  }
}

// ─── Batches ──────────────────────────────────────────────────────────────────

export async function getBatches(tenantId: string): Promise<Batch[]> {
  if (useLocal()) return localDb.getBatches();
  try {
    return await cloudDb.getBatches(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getBatches();
  }
}

export async function addBatch(b: Batch): Promise<void> {
  if (useLocal()) return localDb.addBatch(b);
  try {
    await cloudDb.addBatch(b);
    localDb.addBatch(b);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addBatch(b);
  }
}

export async function updateBatch(id: string, updates: Partial<Batch>): Promise<void> {
  if (useLocal()) return localDb.updateBatch(id, updates);
  try {
    await cloudDb.updateBatch(id, updates);
    localDb.updateBatch(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateBatch(id, updates);
  }
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(tenantId: string): Promise<Customer[]> {
  if (useLocal()) return localDb.getCustomers();
  try {
    return await cloudDb.getCustomers(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getCustomers();
  }
}

export async function addCustomer(c: Customer): Promise<void> {
  if (useLocal()) return localDb.addCustomer(c);
  try {
    await cloudDb.addCustomer(c);
    localDb.addCustomer(c);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addCustomer(c);
  }
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  if (useLocal()) return localDb.updateCustomer(id, updates);
  try {
    await cloudDb.updateCustomer(id, updates);
    localDb.updateCustomer(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateCustomer(id, updates);
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(tenantId: string): Promise<Invoice[]> {
  if (useLocal()) return localDb.getInvoices();
  try {
    return await cloudDb.getInvoices(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getInvoices();
  }
}

export async function addInvoice(inv: Invoice): Promise<void> {
  if (useLocal()) return localDb.addInvoice(inv);
  try {
    await cloudDb.addInvoice(inv);
    localDb.addInvoice(inv);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addInvoice(inv);
  }
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  if (useLocal()) return localDb.updateInvoice(id, updates);
  try {
    await cloudDb.updateInvoice(id, updates);
    localDb.updateInvoice(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateInvoice(id, updates);
  }
}

// ─── Supplier Bills ───────────────────────────────────────────────────────────

export async function getSupplierBills(tenantId: string): Promise<SupplierBill[]> {
  if (useLocal()) return localDb.getSupplierBills();
  try {
    return await cloudDb.getSupplierBills(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getSupplierBills();
  }
}

export async function addSupplierBill(bill: SupplierBill): Promise<void> {
  if (useLocal()) return localDb.addSupplierBill(bill);
  try {
    await cloudDb.addSupplierBill(bill);
    localDb.addSupplierBill(bill);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addSupplierBill(bill);
  }
}

export async function updateSupplierBill(id: string, updates: Partial<SupplierBill>): Promise<void> {
  if (useLocal()) return localDb.updateSupplierBill(id, updates);
  try {
    await cloudDb.updateSupplierBill(id, updates);
    localDb.updateSupplierBill(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateSupplierBill(id, updates);
  }
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(tenantId: string): Promise<Payment[]> {
  if (useLocal()) return localDb.getPayments();
  try {
    return await cloudDb.getPayments(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getPayments();
  }
}

export async function addPayment(payment: Payment): Promise<void> {
  if (useLocal()) return localDb.addPayment(payment);
  try {
    await cloudDb.addPayment(payment);
    localDb.addPayment(payment);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addPayment(payment);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(tenantId: string): Promise<AppUser[]> {
  console.log("[db-hybrid] getUsers called for tenant:", tenantId, "useLocal:", useLocal());
  if (useLocal()) {
    console.log("[db-hybrid] Using local DB for getUsers");
    return localDb.getUsers(tenantId);
  }
  try {
    console.log("[db-hybrid] Attempting cloudDb.getUsers");
    const users = await cloudDb.getUsers(tenantId);
    console.log("[db-hybrid] cloudDb.getUsers returned:", users.length, "users");
    return users;
  } catch (error) {
    console.warn('[db-hybrid] Cloud DB failed for getUsers, using local:', error);
    return localDb.getUsers(tenantId);
  }
}

export async function getUserByEmailAnyTenant(email: string): Promise<AppUser | null> {
  if (useLocal()) return localDb.getUserByEmailAnyTenant(email);
  try {
    return await cloudDb.getUserByEmailAnyTenant(email);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getUserByEmailAnyTenant(email);
  }
}

export async function addUser(user: AppUser): Promise<void> {
  console.log("[db-hybrid] addUser called:", { id: user.id, name: user.name, tenantId: user.tenantId, useLocal: useLocal() });
  if (useLocal()) {
    console.log("[db-hybrid] Using local DB for addUser");
    return localDb.addUser(user);
  }
  try {
    console.log("[db-hybrid] Attempting cloudDb.addUser");
    await cloudDb.addUser(user);
    console.log("[db-hybrid] cloudDb.addUser succeeded, also saving locally");
    localDb.addUser(user);
  } catch (error) {
    console.warn('[db-hybrid] Cloud DB failed, saving locally:', error);
    localDb.addUser(user);
  }
}

export async function updateUser(id: string, updates: Partial<AppUser>): Promise<void> {
  if (useLocal()) return localDb.updateUser(id, updates);
  try {
    await cloudDb.updateUser(id, updates);
    localDb.updateUser(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateUser(id, updates);
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (useLocal()) return localDb.deleteUser(id);
  try {
    await cloudDb.deleteUser(id);
    localDb.deleteUser(id);
  } catch (error) {
    console.warn('Cloud DB failed, deleting locally:', error);
    localDb.deleteUser(id);
  }
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(tenantId: string): Promise<Doctor[]> {
  if (useLocal()) return localDb.getDoctors();
  try {
    return await cloudDb.getDoctors(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getDoctors();
  }
}

export async function addDoctor(doctor: Doctor): Promise<void> {
  if (useLocal()) return localDb.addDoctor(doctor);
  try {
    await cloudDb.addDoctor(doctor);
    localDb.addDoctor(doctor);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.addDoctor(doctor);
  }
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<void> {
  if (useLocal()) return localDb.updateDoctor(id, updates);
  try {
    await cloudDb.updateDoctor(id, updates);
    localDb.updateDoctor(id, updates);
  } catch (error) {
    console.warn('Cloud DB failed, updating locally:', error);
    localDb.updateDoctor(id, updates);
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(tenantId: string): Promise<BusinessSettings> {
  if (useLocal()) return localDb.getSettings(tenantId);
  try {
    return await cloudDb.getSettings(tenantId);
  } catch (error) {
    console.warn('Cloud DB failed, using local:', error);
    return localDb.getSettings(tenantId);
  }
}

export async function saveSettings(tenantId: string, settings: BusinessSettings): Promise<void> {
  if (useLocal()) return localDb.saveSettings(tenantId, settings);
  try {
    await cloudDb.upsertSettings(tenantId, settings);
    localDb.saveSettings(tenantId, settings);
  } catch (error) {
    console.warn('Cloud DB failed, saving locally:', error);
    localDb.saveSettings(tenantId, settings);
  }
}
