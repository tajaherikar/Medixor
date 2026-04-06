import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";
import type { AuthSession } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email: string; password: string };
    console.log('[Login] Attempting login for:', body.email);
    
    const user = await db.getUserByEmailAnyTenant(body.email ?? "");
    if (!user) {
      console.log('[Login] User not found:', body.email);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    
    console.log('[Login] User found:', user.email, 'Tenant:', user.tenantId);
    
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      console.log('[Login] Invalid password for:', body.email);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    
    console.log('[Login] Password valid, creating session...');
    
    // Create secure session
    const session: AuthSession = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role as "admin" | "viewer",
    };
    
    const { passwordHash: _ph, ...safeUser } = user;
    const response = NextResponse.json(safeUser);
    
    // Set session cookie on response
    response.cookies.set("medixor-session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    console.log('[Login] Session created successfully for:', user.email);
    
    return response;
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
