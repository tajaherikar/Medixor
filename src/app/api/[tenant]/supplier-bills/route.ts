import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { Batch } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const bills = await db.getSupplierBills(tenant);
  return NextResponse.json(bills);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const body = await req.json() as Record<string, unknown>;

    const items = (body.items ?? []) as Array<{
      itemName: string;
      batchNumber: string;
      expiryDate: string;
      mrp: number;
      purchasePrice: number;
      quantity: number;
    }>;

    const taxableAmount = items.reduce((sum, i) => sum + i.purchasePrice * i.quantity, 0);

    const newBill: Record<string, unknown> = {
      id: `sbill-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      taxableAmount,
      totalGst: 0,
      grandTotal: taxableAmount,
      paymentStatus: "pending",
      paidAmount: 0,
      ...body,
    };
    await db.addSupplierBill(newBill as never);
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

    return NextResponse.json(newBill, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST supplier-bills error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
