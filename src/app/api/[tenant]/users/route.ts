import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateTenantAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const authResult = await validateTenantAccess(req, tenant);
  if (authResult instanceof NextResponse) return authResult;
  
  try {
    console.log("[Users GET] Fetching users for tenant:", tenant);
    const users = await db.getUsers(tenant);
    console.log("[Users GET] Found users:", users.length);
    return NextResponse.json(users.map(({ passwordHash: _ph, ...u }) => u));
  } catch (error) {
    console.error("[Users GET] Error:", error);
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
  
  try {
    const body = await req.json() as {
      name: string;
      email: string;
      password: string;
      role: string;
      permissions?: Array<string>;
    };
    
    console.log("[Users POST] Creating user:", { name: body.name, email: body.email, role: body.role, tenant });
    
    const passwordHash = await bcrypt.hash(body.password, 10);
    
    // Set default permissions for member role
    let permissions = body.permissions?.filter((p) =>
      ["billing", "inventory", "suppliers", "customers", "doctors", "payments", "reports"].includes(p)
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
    
    console.log("[Users POST] New user object:", { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, permissions: newUser.permissions });
    
    try {
      console.log("[Users POST] Calling db.addUser...");
      await db.addUser(newUser as never);
      console.log("[Users POST] db.addUser completed successfully");
    } catch (dbError) {
      console.error("[Users POST] db.addUser failed:", dbError);
      throw dbError;
    }
    
    const { passwordHash: _ph, ...safeUser } = newUser;
    
    console.log("[Users POST] User created successfully:", safeUser);
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("[Users POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
