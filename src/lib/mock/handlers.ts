import { http, HttpResponse } from "msw";
import {
  mockBatches,
  mockCustomers,
  mockSuppliers,
  mockInvoices,
  mockSupplierBills,
  mockPayments,
} from "@/lib/mock/data";
import { getInventoryStatus } from "@/lib/batch-logic";

const BASE = "/api";

export const handlers = [
  // ── Suppliers ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/suppliers`, () => {
    return HttpResponse.json(mockSuppliers);
  }),

  // ── Inventory / Batches ────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/inventory`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.toLowerCase();

    let batches = mockBatches.map((b) => ({
      ...b,
      status: getInventoryStatus(b.expiryDate),
    }));

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
    const batches = mockBatches.filter(
      (b) =>
        b.itemName.toLowerCase() === itemName.toLowerCase() &&
        b.availableQty > 0 &&
        getInventoryStatus(b.expiryDate) !== "expired"
    );
    return HttpResponse.json(batches);
  }),

  // ── Customers ─────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/customers`, () => {
    return HttpResponse.json(mockCustomers);
  }),

  // ── Invoices ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/invoices`, () => {
    return HttpResponse.json(mockInvoices);
  }),

  http.post(`${BASE}/:tenant/invoices`, async ({ request }) => {
    const body = await request.json();
    const newInvoice = { id: `inv-${Date.now()}`, createdAt: new Date().toISOString(), ...(body as object) };
    mockInvoices.push(newInvoice as never);
    return HttpResponse.json(newInvoice, { status: 201 });
  }),

  // ── Add Supplier ──────────────────────────────────────────────────────────
  http.post(`${BASE}/:tenant/suppliers`, async ({ request }) => {
    const body = await request.json();
    const newSupplier = {
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...(body as object),
    };
    mockSuppliers.push(newSupplier as never);
    return HttpResponse.json(newSupplier, { status: 201 });
  }),

  // ── Add Customer ──────────────────────────────────────────────────────────
  http.post(`${BASE}/:tenant/customers`, async ({ request }) => {
    const body = await request.json();
    const newCustomer = {
      id: `cus-${Date.now()}`,
      tenantId: "demo",
      createdAt: new Date().toISOString(),
      ...(body as object),
    };
    mockCustomers.push(newCustomer as never);
    return HttpResponse.json(newCustomer, { status: 201 });
  }),

  // ── Supplier Bills (Purchase Register) ────────────────────────────────────
  http.get(`${BASE}/:tenant/supplier-bills`, () => {
    return HttpResponse.json(mockSupplierBills);
  }),

  http.post(`${BASE}/:tenant/supplier-bills`, async ({ request }) => {
    const body = await request.json();
    const newBill = {
      id: `sbill-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...(body as object),
    };
    mockSupplierBills.push(newBill as never);
    return HttpResponse.json(newBill, { status: 201 });
  }),

  // ── Payments ──────────────────────────────────────────────────────────────
  http.get(`${BASE}/:tenant/payments`, ({ request }) => {
    const url = new URL(request.url);
    const partyId = url.searchParams.get("partyId");
    const partyType = url.searchParams.get("partyType");
    let payments = [...mockPayments];
    if (partyId) payments = payments.filter((p) => p.partyId === partyId);
    if (partyType) payments = payments.filter((p) => p.partyType === partyType);
    return HttpResponse.json(payments);
  }),

  http.post(`${BASE}/:tenant/payments`, async ({ request }) => {
    const body = await request.json();
    const payment = { id: `pay-${Date.now()}`, createdAt: new Date().toISOString(), ...(body as object) };
    mockPayments.push(payment as never);
    // Update invoice paidAmount + paymentStatus
    const b = body as Record<string, unknown>;
    const inv = mockInvoices.find((i) => i.id === b.invoiceId);
    if (inv) {
      inv.paidAmount = (inv.paidAmount ?? 0) + (b.amount as number);
      if (inv.paidAmount >= inv.grandTotal) inv.paymentStatus = "paid";
      else if (inv.paidAmount > 0) inv.paymentStatus = "partial";
    }
    return HttpResponse.json(payment, { status: 201 });
  }),
];
