import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { name?: string; role?: string; password?: string };
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.role) updates.role = body.role;
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 10);
  await db.updateUser(id, updates as never);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { id } = await params;
  await db.deleteUser(id);
  return NextResponse.json({ success: true });
}
