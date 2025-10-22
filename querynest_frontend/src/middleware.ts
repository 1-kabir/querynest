// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware function
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get('auth');
  
  // Create a default response that will be modified
  let response = NextResponse.next();

  // --- Authentication and Redirection Logic ---

  // 1. If authenticated, prevent access to login/signup pages and root (if it's a login page)
  if (authCookie) {
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup')
    ) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // 2. Protect dashboard routes: Redirect unauthenticated users from /dashboard to /
  if (pathname.startsWith('/dashboard')) {
    if (!authCookie) {
      return NextResponse.redirect(new URL('/', req.url));
    } else {
      // If authenticated and on dashboard, add cache-control headers
      // to prevent browser from showing cached version after logout.
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0'); // For older browsers
    }
  }

  // 3. Protect API routes: Deny access to most /api routes if unauthenticated
  if (pathname.startsWith('/api')) {
    // Allow login and logout API calls even if not authenticated
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
      // Handled by API route, allow through middleware
    }
    // For all other /api routes, require authentication
    else if (!authCookie) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // Return the (potentially modified) response
  return response;
}

// Define the paths where the middleware should run
export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard',
    '/dashboard/:path*',
    '/api/:path*',
  ],
};