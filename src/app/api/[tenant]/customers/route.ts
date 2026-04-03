import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const customers = await db.getCustomers(tenant);
  return NextResponse.json(customers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as Record<string, unknown>;
  const newCustomer = {
    id: `cus-${Date.now()}`,
    tenantId: tenant,
    createdAt: new Date().toISOString(),
    ...body,
  };
  await db.addCustomer(newCustomer as never);
  return NextResponse.json(newCustomer, { status: 201 });
}
