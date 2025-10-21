import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware function
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get('auth');

  if (pathname.startsWith('/dashboard') && !authCookie) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/api') && !authCookie) {
    if (pathname.startsWith('/api/login') || pathname.startsWith('/api/logout')) {
      return NextResponse.next();
    }
    return new NextResponse('Unauthorized', { status: 401 });
  }

  return NextResponse.next();
}

// Define the paths where the middleware should run
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/api/chats/:path*',
    '/api/conversations/:path*',
    '/api/files/:path*',
    '/api/upload/:path*',
  ],
};