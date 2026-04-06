import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { Batch } from "@/lib/types";
import { getInventoryStatus } from "@/lib/batch-logic";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const bills = await db.getSupplierBills(tenant);
  return NextResponse.json(bills);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) return authResult;
    
    const body = await req.json() as Record<string, unknown>;

    const items = (body.items ?? []) as Array<{
      itemName: string;
      batchNumber: string;
      expiryDate: string;
      mrp: number;
      purchasePrice: number;
      quantity: number;
      unitType?: string;
      packSize?: number;
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
      ...body, // body values (including computed GST totals from client) override defaults
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
        ...(item.unitType && { unitType: item.unitType as Batch["unitType"] }),
        ...(item.packSize && { packSize: item.packSize }),
        createdAt: new Date().toISOString(),
      };
      await db.addBatch(newBatch);
    }

    return NextResponse.json(newBill, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : (err as { message?: string })?.message ?? JSON.stringify(err);
    console.error("POST supplier-bills error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
