import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = (process.env.ALLOWED_API_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get('auth');

  const origin = req.headers.get('origin') || '';
  let response = NextResponse.next();

  // --- Redirect logged-in users away from login/signup ---
  if (authCookie && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // --- Protect dashboard routes ---
  if (pathname.startsWith('/dashboard')) {
    if (!authCookie) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // --- Protect API routes ---
  if (pathname.startsWith('/api')) {
    // Always allow login/logout
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
      return response;
    }

    // Only allow requests from allowed origins
    if (!ALLOWED_ORIGINS.includes(origin || '')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Require auth cookie
    if (!authCookie) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  return response;
}

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
