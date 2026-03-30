import { http, HttpResponse } from "msw";
import { getInventoryStatus } from "@/lib/batch-logic";
import { localDb } from "@/lib/local-db";
import { Batch } from "@/lib/types";

const BASE = "/api";

export const handlers = [
  // ── Suppliers ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/suppliers`, () => {
    return HttpResponse.json(localDb.getSuppliers());
  }),

  // ── Inventory / Batches ────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/inventory`, ({ request }) => {
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

  http.get(`${BASE}/:tenant/inventory/:itemName`, ({ params }) => {
    const itemName = decodeURIComponent(params.itemName as string);
    const batches = localDb.getBatches().filter(
      (b) =>
        b.itemName.toLowerCase() === itemName.toLowerCase() &&
        b.availableQty > 0 &&
        getInventoryStatus(b.expiryDate) !== "expired"
    );
    return HttpResponse.json(batches);
  }),

  // ── Customers ─────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/customers`, () => {
    return HttpResponse.json(localDb.getCustomers());
  }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/invoices`, () => {
    return HttpResponse.json(localDb.getInvoices());
  }),

  http.post(`${BASE}/:tenant/invoices`, async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    const newInvoice = {
      id: `inv-${Date.now()}`,
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
  http.post(`${BASE}/:tenant/suppliers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newSupplier = {
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addSupplier(newSupplier as never);
    return HttpResponse.json(newSupplier, { status: 201 });
  }),

  // ── Add Customer ──────────────────────────────────────────────────────────
  http.post(`${BASE}/:tenant/customers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newCustomer = {
      id: `cus-${Date.now()}`,
      tenantId: "demo",
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addCustomer(newCustomer as never);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // ── Supplier Bills (Purchase Register) ────────────────────────────────────
  http.get(`${BASE}/:tenant/supplier-bills`, () => {
    return HttpResponse.json(localDb.getSupplierBills());
  }),

  http.post(`${BASE}/:tenant/supplier-bills`, async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    const tenant = params.tenant as string;
    const newBill = {
      id: `sbill-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addSupplierBill(newBill as never);

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
      localDb.addBatch(newBatch);
    }

    return HttpResponse.json(newBill, { status: 201 });
  }),

  // ── Payments ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/payments`, ({ request }) => {
    const url = new URL(request.url);
    const partyId = url.searchParams.get("partyId");
    const partyType = url.searchParams.get("partyType");
    let payments = localDb.getPayments();
    if (partyId) payments = payments.filter((p) => p.partyId === partyId);
    if (partyType) payments = payments.filter((p) => p.partyType === partyType);
    return HttpResponse.json(payments);
  }),

  http.post(`${BASE}/:tenant/payments`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const payment = {
      id: `pay-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...body,
    };
    localDb.addPayment(payment as never);

    // Update invoice paidAmount + paymentStatus
    const invoiceId = body.invoiceId as string | undefined;
    const amount = body.amount as number | undefined;
    if (invoiceId && amount != null) {
      const inv = localDb.getInvoices().find((i) => i.id === invoiceId);
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
];
