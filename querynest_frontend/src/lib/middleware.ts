import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware function
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow requests to API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Example: block access to some route (optional)
  // if (pathname.startsWith('/admin')) {
  //   return new NextResponse('Access Denied', { status: 403 });
  // }

  // Continue to the requested route
  return NextResponse.next();
}

// Define the paths where the middleware should run
export const config = {
  matcher: ['/api/:path*'], // Only applies to /api routes
};
