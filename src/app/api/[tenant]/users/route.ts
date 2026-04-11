import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateTenantAccess, requireAdmin } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  try {
    const users = await db.getUsers(tenant);
    return NextResponse.json(users.map(({ passwordHash: _ph, ...u }) => u));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  // Only admins can create new users
  const adminCheck = requireAdmin(authResult);
  if (adminCheck) return adminCheck;
  
  try {
    const body = await req.json() as {
      name: string;
      email: string;
      password: string;
      role: string;
      permissions?: Array<string>;
    };
    
    // Validate role - only allow 'admin' or 'member'
    const validRoles = ["admin", "member"];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role '${body.role}'. Allowed values: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }
    
    const passwordHash = await bcrypt.hash(body.password, 10);
    
    // Set default permissions for member role
    let permissions = body.permissions?.filter((p) =>
      ["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"].includes(p)
    );
    
    // Members get default access to billing and inventory
    if ((body.role ?? "member") === "member" && (!permissions || permissions.length === 0)) {
      permissions = ["billing", "inventory"];
    }
    
    const newUser = {
      id: `usr-${Date.now()}`,
      tenantId: tenant,
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash,
      role: body.role ?? "member",
      permissions: permissions && permissions.length > 0 ? permissions : undefined,
      createdAt: new Date().toISOString(),
    };
    
    await db.addUser(newUser as never);
    
    const { passwordHash: _ph, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
