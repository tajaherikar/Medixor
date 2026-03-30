import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { getInventoryStatus } from "@/lib/batch-logic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const url = new URL(req.url);
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

  return NextResponse.json(batches);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as Record<string, unknown>;
  const newBatch = {
    id: `bat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tenantId: tenant,
    status: getInventoryStatus(body.expiryDate as string),
    createdAt: new Date().toISOString(),
    ...body,
  };
  await db.addBatch(newBatch as never);
  return NextResponse.json(newBatch, { status: 201 });
}
