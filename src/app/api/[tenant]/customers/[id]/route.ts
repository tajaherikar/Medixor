import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  await db.updateCustomer(id, body as never);
  return NextResponse.json({ success: true });
}
