import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateTenantAccess, requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { tenant, id } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  // Only admins can update users or reset passwords
  const adminCheck = requireAdmin(authResult);
  if (adminCheck) return adminCheck;
  
  const body = await req.json() as {
    name?: string;
    role?: string;
    password?: string;
    permissions?: Array<string>;
  };
  
  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.role) {
    // Validate role - only allow 'admin' or 'member'
    const validRoles = ["admin", "member"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role '${body.role}'. Allowed values: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }
    updates.role = body.role;
  }
  if (body.permissions !== undefined) {
    const permissions = body.permissions.filter((p) =>
      ["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"].includes(p)
    );
    // Members get default access to billing and inventory
    if ((body.role ?? "member") === "member" && permissions.length === 0) {
      updates.permissions = ["billing", "inventory"];
    } else {
      updates.permissions = permissions;
    }
  }
  if (body.password) updates.passwordHash = await bcrypt.hash(body.password, 10);
  await db.updateUser(id, updates as never);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; id: string }> }
) {
  const { tenant, id } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  // Only admins can delete users
  const adminCheck = requireAdmin(authResult);
  if (adminCheck) return adminCheck;
  
  await db.deleteUser(id);
  return NextResponse.json({ success: true });
}
