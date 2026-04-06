import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { getInventoryStatus } from "@/lib/batch-logic";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; itemName: string }> }
) {
  const { tenant, itemName } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  const decoded = decodeURIComponent(itemName);
  const all = await db.getBatches(tenant);
  const batches = all.filter(
    (b) =>
      b.itemName.toLowerCase() === decoded.toLowerCase() &&
      b.availableQty > 0 &&
      getInventoryStatus(b.expiryDate) !== "expired"
  );
  return NextResponse.json(batches);
}
