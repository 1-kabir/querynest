// app/api/login/route.ts or pages/api/login.ts
import { NextRequest, NextResponse } from "next/server"; // Import NextRequest

export async function POST(req: NextRequest) { // Use NextRequest for protocol access
  const { email, password } = await req.json();

  const DEMO_EMAIL = process.env.DEMO_EMAIL;
  const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const response = NextResponse.json({ message: "Login successful" });

    // Determine if the request was secure (HTTPS)
    // Next.js uses X-Forwarded-Proto from proxies to set req.nextUrl.protocol
    const isSecure = req.nextUrl.protocol === 'https:';

    response.cookies.set({
      name: "auth",
      value: "true",
      httpOnly: true,
      secure: isSecure, // Dynamically set based on request protocol
      sameSite: "lax", // 'lax' is a good default for most web apps
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      // domain: undefined, // Omit 'domain' for same-host access (recommended)
    });
    return response;
  }

  return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
}