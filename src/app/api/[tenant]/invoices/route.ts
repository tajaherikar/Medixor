import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  
  // SECURITY: Validate user has access to this tenant
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const invoices = await db.getInvoices(tenant);
  return NextResponse.json(invoices);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const { tenant } = await params;
    
    // SECURITY: Validate user has access to this tenant
    const authResult = await validateTenantAccess(req, tenant);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    
    const body = await req.json() as Record<string, unknown>;
    const newInvoice: Record<string, unknown> = {
      id: `inv-${Date.now()}`,
      tenantId: tenant,
      createdAt: new Date().toISOString(),
      ...body,
    };

    // Deduct sold quantities from batch inventory
    const lineItems = (newInvoice.lineItems ?? []) as Array<{ batchId: string; quantity: number }>;
    const batches = await db.getBatches(tenant);  // Load once, reuse for all items
    for (const item of lineItems) {
      const batch = batches.find((b) => b.id === item.batchId);
      if (batch) {
        await db.updateBatch(batch.id, {
          availableQty: Math.max(0, batch.availableQty - item.quantity),
        });
      }
    }

    await db.addInvoice(newInvoice as never);
    return NextResponse.json(newInvoice, { status: 201 });
  } catch (err) {
    console.error("[POST /invoices]", JSON.stringify(err));
    // Supabase returns a PostgrestError (not instanceof Error) — extract message directly
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
