import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const customers = await db.getCustomers(tenant);
  return NextResponse.json(customers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
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
