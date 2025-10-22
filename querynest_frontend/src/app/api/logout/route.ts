// app/api/logout/route.ts or pages/api/logout.ts
import { NextRequest, NextResponse } from "next/server"; // Import NextRequest

export async function POST(req: NextRequest) { // Use NextRequest for protocol access
  const response = NextResponse.json({ message: "Logout successful" });

  // Determine if the request was secure (HTTPS)
  const isSecure = req.nextUrl.protocol === 'https:';

  // To effectively delete a cookie, its attributes (path, domain, sameSite, secure)
  // should match the cookie that was originally set.
  response.cookies.set("auth", "", {
    httpOnly: true,
    secure: isSecure, // Crucial: Match the 'secure' attribute of the cookie being deleted
    sameSite: "lax", // Crucial: Match the 'sameSite' attribute
    path: "/",
    maxAge: 0, // Immediately expire the cookie
    // domain: undefined, // Omit 'domain' for consistency
  });
  return response;
}