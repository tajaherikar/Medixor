import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import { BusinessSettings } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const settings = await db.getSettings(tenant);
  return NextResponse.json(settings);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as BusinessSettings;
  await db.upsertSettings(tenant, body);
  return NextResponse.json({ success: true });
}
