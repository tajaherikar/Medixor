import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const users = await db.getUsers(tenant);
  return NextResponse.json(users.map(({ passwordHash: _ph, ...u }) => u));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const body = await req.json() as { name: string; email: string; password: string; role: string };
  const passwordHash = await bcrypt.hash(body.password, 10);
  const newUser = {
    id: `usr-${Date.now()}`,
    tenantId: tenant,
    name: body.name,
    email: body.email.toLowerCase(),
    passwordHash,
    role: body.role ?? "viewer",
    createdAt: new Date().toISOString(),
  };
  await db.addUser(newUser as never);
  const { passwordHash: _ph, ...safeUser } = newUser;
  return NextResponse.json(safeUser, { status: 201 });
}
