// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware function
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get('auth');

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
  if (pathname.startsWith('/dashboard') && !authCookie) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // 3. Protect API routes: Deny access to most /api routes if unauthenticated
  if (pathname.startsWith('/api')) {
    // Allow login and logout API calls even if not authenticated
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
      return NextResponse.next();
    }
    // For all other /api routes, require authentication
    if (!authCookie) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  // Allow the request to proceed for all other cases
  return NextResponse.next();
}

// Define the paths where the middleware should run
export const config = {
  matcher: [
    '/', // Apply middleware to the root path
    '/login', // Apply middleware to the login page
    '/signup', // Apply middleware to the signup page
    '/dashboard',
    '/dashboard/:path*',
    '/api/:path*', // Apply to all API routes
  ],
};