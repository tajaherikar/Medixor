/**
 * Authentication and Authorization Helpers
 * 
 * CRITICAL: These functions ensure tenant isolation and prevent data leakage
 * between different pharmacy accounts.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

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
  // Get session from a signed cookie.
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
 * Extract session from a signed request cookie.
 */
async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthSession | null> {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    
    console.log('[Auth] Cookie check:', {
      hasCookie: !!sessionCookie,
      allCookies: request.cookies.getAll().map(c => c.name).join(', ') || 'none',
    });
    
    if (sessionCookie?.value) {
      const session = await verifySessionToken(sessionCookie.value);
      if (!session) {
        console.warn('[Auth] ✗ Invalid or expired session cookie');
        return null;
      }
      console.log('[Auth] ✓ Session found:', session.email, session.tenantId);
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
  
  cookieStore.set(SESSION_COOKIE_NAME, await signSessionToken(user), getCookieOptions());
}

/**
 * Destroy session on logout
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
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
