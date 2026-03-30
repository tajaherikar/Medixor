import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const invoices = await db.getInvoices(tenant);
  return NextResponse.json(invoices);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as Record<string, unknown>;
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
  return NextResponse.json(newInvoice, { status: 201 });
}
