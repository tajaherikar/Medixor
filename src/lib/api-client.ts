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
  SupplierBillItem,
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

/**
 * Fetch the MRP and Purchase Price from the most recent purchase of an item
 * @param itemName - The name of the item to search for (case-insensitive)
 * @param tenant - The tenant ID
 * @returns Object with mrp and purchasePrice, or null if item not found
 */
export async function fetchLastItemPrices(
  itemName: string,
  tenant: string
): Promise<{ mrp: number; purchasePrice: number } | null> {
  const bills = await fetchSupplierBills(tenant);

  // Find all items matching the name (case-insensitive)
  const matchingItems: Array<{ item: SupplierBillItem; billDate: string }> = [];

  bills.forEach((bill) => {
    bill.items.forEach((item) => {
      if (item.itemName.toLowerCase() === itemName.toLowerCase()) {
        matchingItems.push({
          item,
          billDate: bill.date,
        });
      }
    });
  });

  if (matchingItems.length === 0) {
    return null;
  }

  // Sort by bill date descending and get the most recent
  matchingItems.sort((a, b) => {
    const dateA = new Date(a.billDate).getTime();
    const dateB = new Date(b.billDate).getTime();
    return dateB - dateA;
  });

  const latestItem = matchingItems[0].item;
  return {
    mrp: latestItem.mrp,
    purchasePrice: latestItem.purchasePrice,
  };
}

/**
 * Fetch previous bill details by invoice number (for invoice number smart lookup)
 * Returns supplier ID and date if invoice number exists
 * @param invoiceNumber - The invoice number to search for
 * @param tenant - The tenant ID
 * @returns Object with supplierId and date, or null if not found
 */
export async function fetchPreviousBillByInvoiceNumber(
  invoiceNumber: string,
  tenant: string
): Promise<{ supplierId: string; supplierName: string; date: string } | null> {
  const bills = await fetchSupplierBills(tenant);

  // Find bills with matching invoice number (case-insensitive, trimmed)
  const matchingBills = bills.filter(
    (b) => b.invoiceNumber.toLowerCase().trim() === invoiceNumber.toLowerCase().trim()
  );

  if (matchingBills.length === 0) {
    return null;
  }

  // Sort by date descending and return the most recent
  matchingBills.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  const latestBill = matchingBills[0];
  return {
    supplierId: latestBill.supplierId,
    supplierName: latestBill.supplierName,
    date: latestBill.date,
  };
}

/**
 * Fetch the last used supplier to pre-fill for convenience
 * @param tenant - The tenant ID
 * @returns Supplier ID of most recent purchase, or null
 */
export async function fetchLastUsedSupplierId(tenant: string): Promise<string | null> {
  const bills = await fetchSupplierBills(tenant);

  if (bills.length === 0) {
    return null;
  }

  // Sort by date descending and return the most recent supplier
  bills.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return bills[0].supplierId;
}

/**
 * Calculate average shelf life (days) for an item from a specific supplier
 * @param itemName - The name of the item
 * @param supplierId - The supplier ID
 * @param tenant - The tenant ID
 * @returns Average shelf life in days, or null if not enough data
 */
export async function calculateAverageShelfLife(
  itemName: string,
  supplierId: string,
  tenant: string
): Promise<number | null> {
  const bills = await fetchSupplierBills(tenant);

  // Find all items matching name and supplier
  const matchingEntries: Array<{ billDate: string; expiryDate: string }> = [];

  bills.forEach((bill) => {
    if (bill.supplierId !== supplierId) return;
    bill.items.forEach((item) => {
      if (item.itemName.toLowerCase() === itemName.toLowerCase() && item.expiryDate) {
        matchingEntries.push({
          billDate: bill.date,
          expiryDate: item.expiryDate,
        });
      }
    });
  });

  if (matchingEntries.length < 2) {
    return null; // Not enough data for average
  }

  // Calculate shelf life for each entry (days between purchase and expiry)
  const shelfLives = matchingEntries.map((entry) => {
    const billDate = new Date(entry.billDate).getTime();
    // expiryDate is in YYYY-MM format, convert to last day of that month
    const [year, month] = entry.expiryDate.split("-");
    const expiryDate = new Date(parseInt(year), parseInt(month), 0).getTime();
    const days = Math.floor((expiryDate - billDate) / (1000 * 60 * 60 * 24));
    return days;
  });

  // Return average shelf life
  const average = shelfLives.reduce((a, b) => a + b, 0) / shelfLives.length;
  return Math.round(average);
}

/**
 * Calculate estimated expiry date based on average shelf life
 * @param orderDate - The order/bill date (YYYY-MM-DD format)
 * @param shelfLifeDays - Number of days shelf life
 * @returns Estimated expiry date in YYYY-MM format
 */
export function calculateEstimatedExpiry(orderDate: string, shelfLifeDays: number): string {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + shelfLifeDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Check if invoice number + supplier combo already exists (duplicate detection)
 * @param invoiceNumber - The invoice number
 * @param supplierId - The supplier ID
 * @param tenant - The tenant ID
 * @param excludeBillId - Bill ID to exclude from check (for editing)
 * @returns Existing bill if found, or null
 */
export async function checkDuplicateInvoice(
  invoiceNumber: string,
  supplierId: string,
  tenant: string,
  excludeBillId?: string
): Promise<{ id: string; date: string } | null> {
  const bills = await fetchSupplierBills(tenant);

  const duplicate = bills.find(
    (b) =>
      b.invoiceNumber.toLowerCase().trim() === invoiceNumber.toLowerCase().trim() &&
      b.supplierId === supplierId &&
      (!excludeBillId || b.id !== excludeBillId)
  );

  if (!duplicate) {
    return null;
  }

  return {
    id: duplicate.id,
    date: duplicate.date,
  };
}

/**
 * Fetch the last bill from a specific supplier (for repeat order feature)
 * @param supplierId - The supplier ID
 * @param tenant - The tenant ID
 * @returns Last supplier bill or null
 */
export async function fetchLastBillFromSupplier(
  supplierId: string,
  tenant: string
): Promise<SupplierBill | null> {
  const bills = await fetchSupplierBills(tenant);

  const supplierBills = bills.filter((b) => b.supplierId === supplierId);

  if (supplierBills.length === 0) {
    return null;
  }

  // Sort by date descending and return the most recent
  supplierBills.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });

  return supplierBills[0];
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

