import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { tenant, id } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const body = await req.json() as Record<string, unknown>;
  await db.updateSupplier(id, body as never);
  return NextResponse.json({ success: true });
}
