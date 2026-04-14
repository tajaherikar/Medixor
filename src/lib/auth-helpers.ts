/**
 * Authentication and Authorization Helpers
 * 
 * CRITICAL: These functions ensure tenant isolation and prevent data leakage
 * between different pharmacy accounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export interface AuthSession {
  userId: string;
  email: string;
  tenantId: string;
  role: "admin" | "member";
  permissions?: Array<"billing" | "inventory" | "dashboard" | "suppliers" | "customers" | "doctors" | "payments" | "reports">;
}

/**
 * Validates that a user is authenticated and authorized to access a tenant's data.
 * 
 * This is a CRITICAL security function. It:
 * 1. Checks if the user is logged in (session exists)
 * 2. Verifies the user's tenantId matches the requested tenant
 * 3. Returns 401/403 errors for unauthorized access
 * 
 * @param request - The incoming request
 * @param requestedTenant - The tenant from URL params
 * @returns AuthSession if valid, or NextResponse error
 */
export async function validateTenantAccess(
  request: NextRequest,
  requestedTenant: string
): Promise<AuthSession | NextResponse> {
  // Get session from cookies or headers
  const session = await getSessionFromRequest(request);

  console.log('[Auth] Validating tenant access:', {
    requestedTenant,
    hasSession: !!session,
    sessionTenant: session?.tenantId,
    sessionEmail: session?.email,
    cookies: request.cookies.getAll().map(c => c.name),
  });

  // Check if user is authenticated
  if (!session) {
    console.warn('[Auth] No session found - returning 401');
    return NextResponse.json(
      { error: "Unauthorized - Please login" },
      { status: 401 }
    );
  }

  // CRITICAL: Ensure user can only access their own tenant's data
  if (session.tenantId !== requestedTenant) {
    console.error(
      `[SECURITY] Unauthorized tenant access attempt:`,
      `User ${session.email} (tenant: ${session.tenantId}) tried to access tenant: ${requestedTenant}`
    );
    
    return NextResponse.json(
      { error: "Forbidden - You don't have access to this tenant's data" },
      { status: 403 }
    );
  }

  console.log('[Auth] ✓ Access granted for', session.email, 'to', requestedTenant);
  return session;
}

/**
 * Extract session from request cookies or authorization header
 */
async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthSession | null> {
  try {
    // Method 1: Check for session cookie from request (API routes)
    const sessionCookie = request.cookies.get("medixor-session");
    
    console.log('[Auth] Cookie check:', {
      hasCookie: !!sessionCookie,
      allCookies: request.cookies.getAll().map(c => c.name).join(', ') || 'none',
    });
    
    if (sessionCookie?.value) {
      // Cookie values are automatically URL-decoded by Next.js
      const session = JSON.parse(sessionCookie.value) as AuthSession;
      console.log('[Auth] ✓ Session found:', session.email, session.tenantId);
      return session;
    }

    // Method 2: Check Authorization header (for API clients)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = JSON.parse(Buffer.from(token, "base64").toString()) as AuthSession;
      console.log('[Auth] ✓ Session from header:', session.email);
      return session;
    }

    console.warn('[Auth] ✗ No session found');
    return null;
  } catch (error) {
    console.error("[Auth] ✗ Failed to parse session:", error);
    return null;
  }
}

/**
 * Create a session cookie after successful login
 */
export async function createSession(user: AuthSession): Promise<void> {
  const cookieStore = await cookies();
  
  // Store session in httpOnly cookie (more secure than localStorage)
  cookieStore.set("medixor-session", JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Destroy session on logout
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("medixor-session");
}

/**
 * Helper to check if user has admin role
 */
export function requireAdmin(session: AuthSession): NextResponse | null {
  if (session.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden - Admin access required" },
      { status: 403 }
    );
  }
  return null;
}
