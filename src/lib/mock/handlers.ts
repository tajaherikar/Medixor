import { http, HttpResponse } from "msw";
import {
  mockBatches,
  mockCustomers,
  mockSuppliers,
  mockInvoices,
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
];
