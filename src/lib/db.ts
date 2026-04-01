/**
 * db.ts
 * -----
 * Async Supabase-backed data layer. Drop-in replacement for local-db.ts.
 *
 * Table column names match the TypeScript interfaces exactly (camelCase).
 * See supabase/schema.sql for the DDL to run in your Supabase project.
 */

import { supabase } from "@/lib/supabase";
import { Batch, BusinessSettings, Customer, defaultBusinessSettings, Doctor, Supplier, Invoice, SupplierBill, Payment, AppUser } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(tenantId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as Supplier[];
}

export async function addSupplier(s: Supplier): Promise<void> {
  const { error } = await supabase.from("suppliers").insert(s);
  if (error) throw error;
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  const { error } = await supabase.from("suppliers").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Batches / Inventory ──────────────────────────────────────────────────────

export async function getBatches(tenantId: string): Promise<Batch[]> {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return (data as Batch[]).map((b) => ({
    ...b,
    status: getInventoryStatus(b.expiryDate),
  }));
}

export async function addBatch(b: Batch): Promise<void> {
  const { error } = await supabase.from("batches").insert(b);
  if (error) throw error;
}

export async function updateBatch(id: string, updates: Partial<Batch>): Promise<void> {
  const { error } = await supabase.from("batches").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(tenantId: string): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function addCustomer(c: Customer): Promise<void> {
  const { error } = await supabase.from("customers").insert(c);
  if (error) throw error;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  const { error } = await supabase.from("customers").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(tenantId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as Invoice[];
}

export async function addInvoice(inv: Invoice): Promise<void> {
  const { error } = await supabase.from("invoices").insert(inv);
  if (error) throw error;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
  const { error } = await supabase.from("invoices").update(updates).eq("id", id);
  if (error) throw error;
}

// ─── Supplier Bills ───────────────────────────────────────────────────────────

export async function getSupplierBills(tenantId: string): Promise<SupplierBill[]> {
  const { data, error } = await supabase
    .from("supplier_bills")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as SupplierBill[];
}

export async function addSupplierBill(bill: SupplierBill): Promise<void> {
  const { error } = await supabase.from("supplier_bills").insert(bill);
  if (error) throw error;
}

export async function updateSupplierBill(id: string, updates: Partial<SupplierBill>): Promise<void> {
  const { error } = await supabase
    .from("supplier_bills")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(tenantId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as Payment[];
}

export async function addPayment(p: Payment): Promise<void> {
  const { error } = await supabase.from("payments").insert(p);
  if (error) throw error;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(tenantId: string): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return data as AppUser[];
}

export async function getUserByEmail(email: string, tenantId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("tenantId", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data as AppUser | null;
}

export async function getUserByEmailAnyTenant(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as AppUser | null;
}

// ─── Tenant Settings ──────────────────────────────────────────────────────────

export async function getSettings(tenantId: string): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from("tenant_settings")
    .select("*")
    .eq("tenantId", tenantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...defaultBusinessSettings };
  const { tenantId: _tid, updatedAt: _ua, ...rest } = data as Record<string, unknown>;
  void _tid; void _ua;
  return { ...defaultBusinessSettings, ...rest } as BusinessSettings;
}

export async function upsertSettings(tenantId: string, settings: BusinessSettings): Promise<void> {
  const { error } = await supabase.from("tenant_settings").upsert(
    { tenantId, ...settings, updatedAt: new Date().toISOString() },
    { onConflict: "tenantId" }
  );
  if (error) throw error;
}

export async function addUser(u: AppUser): Promise<void> {
  const { error } = await supabase.from("users").insert(u);
  if (error) throw error;
}

export async function updateUser(id: string, updates: Partial<Omit<AppUser, "id">>): Promise<void> {
  const { error } = await supabase.from("users").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}

// ─── Doctors ──────────────────────────────────────────────────────────────────────────────

export async function getDoctors(tenantId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as Doctor[];
}

export async function addDoctor(d: Doctor): Promise<void> {
  const { error } = await supabase.from("doctors").insert(d);
  if (error) throw error;
}

export async function updateDoctor(id: string, updates: Partial<Doctor>): Promise<void> {
  const { error } = await supabase.from("doctors").update(updates).eq("id", id);
  if (error) throw error;
}
