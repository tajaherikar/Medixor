import { http, HttpResponse } from "msw";
import { getInventoryStatus } from "@/lib/batch-logic";
import { localDb } from "@/lib/local-db";
import { validateInvoice, validateSupplierBill } from "@/lib/gst-calculator";
import { Batch, BusinessSettings } from "@/lib/types";
import bcrypt from "bcryptjs";

const BASE = "/api";

export const handlers = [
  // ── Suppliers ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/suppliers`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const limitStr = url.searchParams.get("limit");
    const offsetStr = url.searchParams.get("offset");

    let suppliers = localDb.getSuppliers();
    if (search) {
      suppliers = suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.phone?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search) ||
          s.gstNumber?.toLowerCase().includes(search)
      );
    }
    
    // If no pagination params, return plain array for backward compatibility
    if (!limitStr && !offsetStr) {
      return HttpResponse.json(suppliers);
    }
    
    // Handle pagination
    const limit = limitStr ? parseInt(limitStr) : suppliers.length;
    const offset = offsetStr ? parseInt(offsetStr) : 0;
    const total = suppliers.length;
    const paginatedSuppliers = suppliers.slice(offset, offset + limit);
    const page = Math.floor(offset / limit);
    const totalPages = Math.ceil(total / limit);
    
    return HttpResponse.json({
      data: paginatedSuppliers,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNextPage: offset + limit < total,
      hasPreviousPage: offset > 0,
    });
  }),

  // ── Inventory / Batches ────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/inventory`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.toLowerCase();

    let batches = localDb.getBatches();

    if (status && status !== "all") {
      batches = batches.filter((b) => b.status === status);
    }
    if (search) {
      batches = batches.filter(
        (b) =>
          b.itemName.toLowerCase().includes(search) ||
          b.batchNumber.toLowerCase().includes(search) ||
          b.supplierName.toLowerCase().includes(search)
      );
    }

    return HttpResponse.json(batches);
  }),

  http.get(`${BASE}/:tenant/inventory/:itemName`, async ({ params }) => {
    const tenant = params.tenant as string;
    const itemName = decodeURIComponent(params.itemName as string);
    const all = localDb.getBatches();
    const batches = all.filter(
      (b) =>
        b.itemName.toLowerCase() === itemName.toLowerCase() &&
        b.availableQty > 0 &&
        getInventoryStatus(b.expiryDate) !== "expired"
    );
    return HttpResponse.json(batches);
  }),

  // ── Customers ─────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/customers`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const limitStr = url.searchParams.get("limit");
    const offsetStr = url.searchParams.get("offset");

    let customers = localDb.getCustomers();
    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone?.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.gstNumber?.toLowerCase().includes(search)
      );
    }
    
    // If no pagination params, return plain array for backward compatibility
    if (!limitStr && !offsetStr) {
      return HttpResponse.json(customers);
    }
    
    // Handle pagination
    const limit = limitStr ? parseInt(limitStr) : customers.length;
    const offset = offsetStr ? parseInt(offsetStr) : 0;
    const total = customers.length;
    const paginatedCustomers = customers.slice(offset, offset + limit);
    const page = Math.floor(offset / limit);
    const totalPages = Math.ceil(total / limit);
    
    return HttpResponse.json({
      data: paginatedCustomers,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNextPage: offset + limit < total,
      hasPreviousPage: offset > 0,
    });
  }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/invoices`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit");
    const offsetStr = url.searchParams.get("offset");
    
    let invoices = localDb.getInvoices();
    
    // If no pagination params, return plain array for backward compatibility
    if (!limitStr && !offsetStr) {
      return HttpResponse.json(invoices);
    }
    
    // Handle pagination
    const limit = limitStr ? parseInt(limitStr) : invoices.length; // Default: all
    const offset = offsetStr ? parseInt(offsetStr) : 0;
    
    const total = invoices.length;
    const paginatedInvoices = invoices.slice(offset, offset + limit);
    const page = Math.floor(offset / limit);
    const totalPages = Math.ceil(total / limit);
    
    return HttpResponse.json({
      data: paginatedInvoices,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNextPage: offset + limit < total,
      hasPreviousPage: offset > 0,
    });
  }),

  http.post(`${BASE}/:tenant/invoices`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    
    // Validate invoice before saving
    const validation = validateInvoice({
      subtotal: (body.subtotal as number) ?? 0,
      customerDiscountAmount: (body.customerDiscountAmount as number) ?? 0,
      totalGst: (body.totalGst as number) ?? 0,
      grandTotal: (body.grandTotal as number) ?? 0,
    });

    if (!validation.isValid) {
      return HttpResponse.json(
        {
          error: "Invoice validation failed",
          discrepancies: validation.discrepancies,
          expected: { grandTotal: validation.expectedGrandTotal },
          actual: { grandTotal: validation.actualGrandTotal },
        },
        { status: 400 }
      );
    }

    const newInvoice: Record<string, unknown> = {
      id: `inv-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };

    // Deduct sold quantities from batch inventory
    const lineItems = (newInvoice.lineItems ?? []) as Array<{ batchId: string; quantity: number }>;
    for (const item of lineItems) {
      const batches = localDb.getBatches();
      const batch = batches.find((b) => b.id === item.batchId);
      if (batch) {
        localDb.updateBatch(batch.id, {
          availableQty: Math.max(0, batch.availableQty - item.quantity),
        });
      }
    }

    localDb.addInvoice(newInvoice as never);
    return HttpResponse.json(newInvoice, { status: 201 });
  }),

  // ── Add Supplier ──────────────────────────────────────────────────────────
  http.post(`${BASE}/:tenant/suppliers`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    const newSupplier: Record<string, unknown> = {
      id: `sup-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addSupplier(newSupplier as never);
    return HttpResponse.json(newSupplier, { status: 201 });
  }),

  // ── Add Customer ──────────────────────────────────────────────────────────
  http.post(`${BASE}/:tenant/customers`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    const newCustomer: Record<string, unknown> = {
      id: `cus-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addCustomer(newCustomer as never);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // ── Supplier Bills ─────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/supplier-bills`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit");
    const offsetStr = url.searchParams.get("offset");
    
    let bills = localDb.getSupplierBills();
    
    // If no pagination params, return plain array for backward compatibility
    if (!limitStr && !offsetStr) {
      return HttpResponse.json(bills);
    }
    
    // Handle pagination
    const limit = limitStr ? parseInt(limitStr) : bills.length;
    const offset = offsetStr ? parseInt(offsetStr) : 0;
    
    const total = bills.length;
    const paginatedBills = bills.slice(offset, offset + limit);
    const page = Math.floor(offset / limit);
    const totalPages = Math.ceil(total / limit);
    
    return HttpResponse.json({
      data: paginatedBills,
      total,
      page,
      pageSize: limit,
      totalPages,
      hasNextPage: offset + limit < total,
      hasPreviousPage: offset > 0,
    });
  }),

  http.post(`${BASE}/:tenant/supplier-bills`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;

    const items = (body.items ?? []) as Array<{
      itemName: string;
      batchNumber: string;
      expiryDate: string;
      mrp: number;
      purchasePrice: number;
      quantity: number;
      schemeQuantity?: number;
      schemePattern?: string;
    }>;
    const taxableAmount = items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);
    const totalGst = (body.totalGst as number) ?? 0;
    const grandTotal = (body.grandTotal as number) ?? taxableAmount + totalGst;

    // Validate bill before saving
    const validation = validateSupplierBill({
      taxableAmount,
      totalGst,
      grandTotal,
    });

    if (!validation.isValid) {
      return HttpResponse.json(
        {
          error: "Supplier bill validation failed",
          discrepancies: validation.discrepancies,
          expected: { grandTotal: validation.expectedGrandTotal },
          actual: { grandTotal: validation.actualGrandTotal },
        },
        { status: 400 }
      );
    }

    const newBill: Record<string, unknown> = {
      id: `sbill-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      taxableAmount,
      totalGst,
      grandTotal,
      paymentStatus: "pending",
      paidAmount: 0,
      ...body,
    };
    localDb.addSupplierBill(newBill as never);

    // Add each item as a new inventory batch
    const supplierId = (newBill.supplierId as string) ?? "";
    const supplierName = (newBill.supplierName as string) ?? "";
    const invoiceNumber = (newBill.invoiceNumber as string) ?? "";

    for (const item of items) {
      const newBatch: Batch = {
        id: `bat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tenantId: tenant,
        itemName: item.itemName,
        batchNumber: item.batchNumber,
        supplierId,
        supplierName,
        invoiceNumber,
        expiryDate: item.expiryDate,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        availableQty: item.quantity + (item.schemeQuantity || 0),
        originalQty: item.quantity,
        status: getInventoryStatus(item.expiryDate),
        createdAt: new Date().toISOString(),
        schemeQuantity: item.schemeQuantity,
        schemePattern: item.schemePattern,
      };
      localDb.addBatch(newBatch);
    }

    return HttpResponse.json(newBill, { status: 201 });
  }),

  http.put(`${BASE}/:tenant/supplier-bills/:billId`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const billId = params.billId as string;
    const body = await request.json() as Record<string, unknown>;

    // Validate bill before updating
    const validation = validateSupplierBill({
      taxableAmount: (body.taxableAmount as number) ?? 0,
      totalGst: (body.totalGst as number) ?? 0,
      grandTotal: (body.grandTotal as number) ?? 0,
    });

    if (!validation.isValid) {
      return HttpResponse.json(
        {
          error: "Supplier bill validation failed",
          discrepancies: validation.discrepancies,
          expected: { grandTotal: validation.expectedGrandTotal },
          actual: { grandTotal: validation.actualGrandTotal },
        },
        { status: 400 }
      );
    }

    localDb.updateSupplierBill(billId, body as never);

    return HttpResponse.json({ success: true, message: "Bill updated successfully" });
  }),

  // ── Payments ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/payments`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const partyId = url.searchParams.get("partyId");
    const partyType = url.searchParams.get("partyType");
    let payments = localDb.getPayments();
    if (partyId) payments = payments.filter((p) => p.partyId === partyId);
    if (partyType) payments = payments.filter((p) => p.partyType === partyType);
    return HttpResponse.json(payments);
  }),

  http.post(`${BASE}/:tenant/payments`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    const payment: Record<string, unknown> = {
      id: `pay-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addPayment(payment as never);

    // Update invoice paidAmount + paymentStatus
    const invoiceId = body.invoiceId as string | undefined;
    const amount = body.amount as number | undefined;
    if (invoiceId && amount != null) {
      const invoices = localDb.getInvoices();
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        const newPaid = (inv.paidAmount ?? 0) + amount;
        localDb.updateInvoice(invoiceId, {
          paidAmount: newPaid,
          paymentStatus:
            newPaid >= inv.grandTotal ? "paid"
            : newPaid > 0 ? "partial"
            : "unpaid",
        });
      }
    }

    return HttpResponse.json(payment, { status: 201 });
  }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    const user = localDb.getUserByEmailAnyTenant(body.email ?? "");
    if (!user) {
      return HttpResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return HttpResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    const { passwordHash: _ph, ...safeUser } = user;
    return HttpResponse.json(safeUser);
  }),

  // ── Users (admin) ─────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/users`, async ({ params }) => {
    const tenant = params.tenant as string;
    const users = localDb.getUsers();
    return HttpResponse.json(users.map(({ passwordHash: _ph, ...u }) => u));
  }),

  http.post(`${BASE}/:tenant/users`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as { name: string; email: string; password: string; role: string; permissions?: string[] };
    const passwordHash = await bcrypt.hash(body.password, 10);
    
    // Set default permissions for member role
    let permissions = body.permissions?.filter((p) =>
      ["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"].includes(p)
    );
    
    // Members get default access to billing and inventory
    if ((body.role ?? "member") === "member" && (!permissions || permissions.length === 0)) {
      permissions = ["billing", "inventory"];
    }
    
    const newUser = {
      id: `usr-${Date.now()}`,
      tenantId: tenant,
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role ?? "member",
      permissions,
      createdAt: new Date().toISOString(),
    };
    localDb.addUser(newUser as never);
    const { passwordHash: _ph, ...safeUser } = newUser;
    return HttpResponse.json(safeUser, { status: 201 });
  }),

  http.patch(`${BASE}/:tenant/users/:id`, async ({ request, params }) => {
    const id = params.id as string;
    const body = await request.json() as { name?: string; role?: string; password?: string; permissions?: string[] };
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.role) updates.role = body.role;
    if (body.permissions !== undefined) {
      const permissions = body.permissions.filter((p) =>
        ["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"].includes(p)
      );
      // Members get default access to billing and inventory
      if ((body.role ?? "member") === "member" && permissions.length === 0) {
        updates.permissions = ["billing", "inventory"];
      } else {
        updates.permissions = permissions;
      }
    }
    if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 10);
    localDb.updateUser(id, updates as never);
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${BASE}/:tenant/users/:id`, async ({ params }) => {
    const id = params.id as string;
    localDb.deleteUser(id);
    return HttpResponse.json({ success: true });
  }),

  // ── Tenant Settings ───────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/settings`, async ({ params }) => {
    const tenant = params.tenant as string;
    const settings = localDb.getSettings(tenant);
    return HttpResponse.json(settings);
  }),

  http.put(`${BASE}/:tenant/settings`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as BusinessSettings;
    localDb.saveSettings(tenant, body);
    return HttpResponse.json({ success: true });
  }),
];
