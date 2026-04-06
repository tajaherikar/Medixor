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
  
  const suppliers = await db.getSuppliers(tenant);
  return NextResponse.json(suppliers);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
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
