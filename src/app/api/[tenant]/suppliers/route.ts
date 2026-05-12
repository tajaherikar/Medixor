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
  
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase();
  
  let suppliers = await db.getSuppliers(tenant);
  
  // Filter by search if provided
  if (search) {
    suppliers = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.phone?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search) ||
        s.gstNumber?.toLowerCase().includes(search)
    );
  }
  
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
