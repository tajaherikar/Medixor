import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const suppliers = await db.getSuppliers(tenant);
  return NextResponse.json(suppliers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as Record<string, unknown>;
  const newSupplier = {
    id: `sup-${Date.now()}`,
    tenantId: tenant,
    createdAt: new Date().toISOString(),
    ...body,
  };
  await db.addSupplier(newSupplier as never);
  return NextResponse.json(newSupplier, { status: 201 });
}
