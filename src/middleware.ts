import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware]', pathname, 'Cookie:', request.cookies.has('medixor-session'));

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/health'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow all API routes through - they have their own validateTenantAccess()
  if (pathname.startsWith('/api/')) {
    console.log('[Middleware] Allowing API route:', pathname);
    return NextResponse.next();
  }

  // Check for session cookie (for page routes only)
  const sessionCookie = request.cookies.get('medixor-session');
  
  // If no session cookie, redirect to login
  if (!sessionCookie) {
    console.log(`[Middleware] No session found for ${pathname}, redirecting to login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate tenant access for tenant pages
  if (pathname.match(/^\/[^\/]+\//)) {
    try {
      const session = JSON.parse(decodeURIComponent(sessionCookie.value));
      const requestedTenant = pathname.split('/')[1];
      
      // Allow if tenant matches
      if (session.tenantId !== requestedTenant) {
        console.error(
          `[Middleware] Unauthorized page access: User ${session.email} (${session.tenantId}) accessing /${requestedTenant}`
        );
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('error', 'wrong-tenant');
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('[Middleware] Invalid session cookie:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
