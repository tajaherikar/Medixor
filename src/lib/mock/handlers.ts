import { http, HttpResponse } from "msw";
import { getInventoryStatus } from "@/lib/batch-logic";
import * as db from "@/lib/db";
import { Batch } from "@/lib/types";
import bcrypt from "bcryptjs";

const BASE = "/api";

export const handlers = [
  // ── Suppliers ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/suppliers`, async ({ params }) => {
    const tenant = params.tenant as string;
    const suppliers = await db.getSuppliers(tenant);
    return HttpResponse.json(suppliers);
  }),

  // ── Inventory / Batches ────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/inventory`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.toLowerCase();

    let batches = await db.getBatches(tenant);

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
    const all = await db.getBatches(tenant);
    const batches = all.filter(
      (b) =>
        b.itemName.toLowerCase() === itemName.toLowerCase() &&
        b.availableQty > 0 &&
        getInventoryStatus(b.expiryDate) !== "expired"
    );
    return HttpResponse.json(batches);
  }),

  // ── Customers ─────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/customers`, async ({ params }) => {
    const tenant = params.tenant as string;
    const customers = await db.getCustomers(tenant);
    return HttpResponse.json(customers);
  }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/invoices`, async ({ params }) => {
    const tenant = params.tenant as string;
    const invoices = await db.getInvoices(tenant);
    return HttpResponse.json(invoices);
  }),

  http.post(`${BASE}/:tenant/invoices`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    const newInvoice: Record<string, unknown> = {
      id: `inv-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };

    // Deduct sold quantities from batch inventory
    const lineItems = (newInvoice.lineItems ?? []) as Array<{ batchId: string; quantity: number }>;
    for (const item of lineItems) {
      const batches = await db.getBatches(tenant);
      const batch = batches.find((b) => b.id === item.batchId);
      if (batch) {
        await db.updateBatch(batch.id, {
          availableQty: Math.max(0, batch.availableQty - item.quantity),
        });
      }
    }

    await db.addInvoice(newInvoice as never);
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
    await db.addSupplier(newSupplier as never);
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
    await db.addCustomer(newCustomer as never);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // ── Supplier Bills (Purchase Register) ────────────────────────────────────
  http.get(`${BASE}/:tenant/supplier-bills`, async ({ params }) => {
    const tenant = params.tenant as string;
    const bills = await db.getSupplierBills(tenant);
    return HttpResponse.json(bills);
  }),

  http.post(`${BASE}/:tenant/supplier-bills`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as Record<string, unknown>;
    const newBill: Record<string, unknown> = {
      id: `sbill-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };
    await db.addSupplierBill(newBill as never);

    // Add each item as a new inventory batch
    const items = (newBill.items ?? []) as Array<{
      itemName: string;
      batchNumber: string;
      expiryDate: string;
      mrp: number;
      purchasePrice: number;
      quantity: number;
    }>;
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
        availableQty: item.quantity,
        originalQty: item.quantity,
        status: getInventoryStatus(item.expiryDate),
        createdAt: new Date().toISOString(),
      };
      await db.addBatch(newBatch);
    }

    return HttpResponse.json(newBill, { status: 201 });
  }),

  // ── Payments ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/payments`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const url = new URL(request.url);
    const partyId = url.searchParams.get("partyId");
    const partyType = url.searchParams.get("partyType");
    let payments = await db.getPayments(tenant);
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
    await db.addPayment(payment as never);

    // Update invoice paidAmount + paymentStatus
    const invoiceId = body.invoiceId as string | undefined;
    const amount = body.amount as number | undefined;
    if (invoiceId && amount != null) {
      const invoices = await db.getInvoices(tenant);
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        const newPaid = (inv.paidAmount ?? 0) + amount;
        await db.updateInvoice(invoiceId, {
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
    const user = await db.getUserByEmailAnyTenant(body.email ?? "");
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
    const users = await db.getUsers(tenant);
    return HttpResponse.json(users.map(({ passwordHash: _ph, ...u }) => u));
  }),

  http.post(`${BASE}/:tenant/users`, async ({ request, params }) => {
    const tenant = params.tenant as string;
    const body = await request.json() as { name: string; email: string; password: string; role: string };
    const passwordHash = await bcrypt.hash(body.password, 10);
    const newUser = {
      id: `usr-${Date.now()}`,
      tenantId: tenant,
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role ?? "viewer",
      createdAt: new Date().toISOString(),
    };
    await db.addUser(newUser as never);
    const { passwordHash: _ph, ...safeUser } = newUser;
    return HttpResponse.json(safeUser, { status: 201 });
  }),

  http.patch(`${BASE}/:tenant/users/:id`, async ({ request, params }) => {
    const id = params.id as string;
    const body = await request.json() as { name?: string; role?: string; password?: string };
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;
    if (body.role) updates.role = body.role;
    if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 10);
    await db.updateUser(id, updates as never);
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${BASE}/:tenant/users/:id`, async ({ params }) => {
    const id = params.id as string;
    await db.deleteUser(id);
    return HttpResponse.json({ success: true });
  }),
];
