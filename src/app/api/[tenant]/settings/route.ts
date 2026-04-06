import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { BusinessSettings } from "@/lib/types";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const settings = await db.getSettings(tenant);
  return NextResponse.json(settings);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const body = await req.json() as BusinessSettings;
  await db.saveSettings(tenant, body);
  return NextResponse.json({ success: true });
}
