/**
 * Client-side database API
 * This mirrors the API route responses but works offline using localStorage
 */

import { localDb } from "@/lib/local-db";
import type {
  Batch,
  Customer,
  Doctor,
  Supplier,
  Invoice,
  SupplierBill,
  Payment,
  BusinessSettings,
  AppUser,
} from "@/lib/types";

// Check if we're offline or in Electron
function shouldUseLocal(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isElectron = !!(window as any).electron?.isElectron;
  const isOffline = !navigator.onLine;
  
  return isElectron || isOffline;
}

// Generic API call with offline fallback for GET requests
async function apiCall<T>(
  url: string,
  localFn: () => T
): Promise<T> {
  if (shouldUseLocal()) {
    // Use local data immediately
    return Promise.resolve(localFn());
  }
  
  try {
    // Try cloud API first
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`API call failed for ${url}, using local data:`, error);
    // Fallback to local
    return localFn();
  }
}

// Generic API write with offline fallback for POST/PUT/DELETE
async function apiWrite<T>(
  url: string,
  options: RequestInit,
  localFn: () => T
): Promise<T> {
  if (shouldUseLocal()) {
    // Use local immediately
    return Promise.resolve(localFn());
  }
  
  try {
    // Try cloud API first
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // Also save locally for offline cache
    localFn();
    
    return await res.json();
  } catch (error) {
    console.warn(`API write failed for ${url}, using local:`, error);
    // Fallback to local
    return localFn();
  }
}

// API wrapper functions that match your existing API routes

export async function fetchInventory(tenant: string): Promise<Batch[]> {
  return apiCall(
    `/api/${tenant}/inventory`,
    () => localDb.getBatches()
  );
}

export async function fetchInvoices(tenant: string): Promise<Invoice[]> {
  return apiCall(
    `/api/${tenant}/invoices`,
    () => localDb.getInvoices()
  );
}

export async function fetchSupplierBills(tenant: string): Promise<SupplierBill[]> {
  return apiCall(
    `/api/${tenant}/supplier-bills`,
    () => localDb.getSupplierBills()
  );
}

export async function fetchDoctors(tenant: string): Promise<Doctor[]> {
  return apiCall(
    `/api/${tenant}/doctors`,
    () => localDb.getDoctors()
  );
}

export async function fetchCustomers(tenant: string): Promise<Customer[]> {
  return apiCall(
    `/api/${tenant}/customers`,
    () => localDb.getCustomers()
  );
}

export async function fetchSuppliers(tenant: string): Promise<Supplier[]> {
  return apiCall(
    `/api/${tenant}/suppliers`,
    () => localDb.getSuppliers()
  );
}

export async function fetchPayments(tenant: string): Promise<Payment[]> {
  return apiCall(
    `/api/${tenant}/payments`,
    () => localDb.getPayments()
  );
}

export async function fetchSettings(tenant: string): Promise<BusinessSettings> {
  return apiCall(
    `/api/${tenant}/settings`,
    () => localDb.getSettings(tenant)
  );
}

export async function fetchUsers(tenant: string): Promise<AppUser[]> {
  return apiCall(
    `/api/${tenant}/users`,
    () => localDb.getUsers(tenant)
  );
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export async function addCustomer(tenant: string, customer: Customer): Promise<Customer> {
  return apiWrite(
    `/api/${tenant}/customers`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    },
    () => {
      localDb.addCustomer(customer);
      return customer;
    }
  );
}

export async function updateCustomer(tenant: string, id: string, updates: Partial<Customer>): Promise<Customer> {
  return apiWrite(
    `/api/${tenant}/customers/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
    () => {
      localDb.updateCustomer(id, updates);
      return { ...updates, id } as Customer;
    }
  );
}

export async function addDoctor(tenant: string, doctor: Doctor): Promise<Doctor> {
  return apiWrite(
    `/api/${tenant}/doctors`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doctor),
    },
    () => {
      localDb.addDoctor(doctor);
      return doctor;
    }
  );
}

export async function updateDoctor(tenant: string, id: string, updates: Partial<Doctor>): Promise<Doctor> {
  return apiWrite(
    `/api/${tenant}/doctors/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
    () => {
      localDb.updateDoctor(id, updates);
      return { ...updates, id } as Doctor;
    }
  );
}

export async function addInvoice(tenant: string, invoice: Invoice): Promise<Invoice> {
  return apiWrite(
    `/api/${tenant}/invoices`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    },
    () => {
      localDb.addInvoice(invoice);
      return invoice;
    }
  );
}

export async function addPayment(tenant: string, payment: Payment): Promise<Payment> {
  return apiWrite(
    `/api/${tenant}/payments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    },
    () => {
      localDb.addPayment(payment);
      return payment;
    }
  );
}

export async function saveSettings(tenant: string, settings: BusinessSettings): Promise<BusinessSettings> {
  return apiWrite(
    `/api/${tenant}/settings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    },
    () => {
      localDb.saveSettings(tenant, settings);
      return settings;
    }
  );
}

