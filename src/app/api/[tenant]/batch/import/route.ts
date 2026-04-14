import { NextRequest, NextResponse } from "next/server";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json(
    { error: "Batch import endpoint not yet implemented" },
    { status: 501 }
  );
}
