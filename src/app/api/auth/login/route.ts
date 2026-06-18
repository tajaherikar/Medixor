import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/session-token";
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
      role: user.role as "admin" | "member",
      permissions: user.permissions,
    };
    
    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    
    console.log('[Login] SafeUser being returned:', { 
      email: safeUser.email, 
      role: safeUser.role,
      userId: safeUser.id,
      tenantId: safeUser.tenantId,
      allFields: Object.keys(safeUser)
    });
    
    const response = NextResponse.json(safeUser);
    await setSessionCookie(response, session);
    
    console.log('[Login] Session created successfully for:', user.email);
    
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[login] error:", message, err);
    const isConfigError =
      /AUTH_SECRET|SUPABASE_SERVICE_ROLE_KEY|Missing.*secret/i.test(message);
    return NextResponse.json(
      {
        error: isConfigError
          ? "Server configuration error. Ensure AUTH_SECRET or Supabase keys are set in Vercel."
          : "Internal server error",
      },
      { status: 500 }
    );
  }
}
