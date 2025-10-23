// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * ALLOWED_API_ORIGINS env format:
 *   demo1.kabirstudios.com,www.demo1.kabirstudios.com,localhost
 *
 * Values are normalized to hostnames (no protocol, no trailing slash).
 */
const ALLOWED_ORIGINS = (process.env.ALLOWED_API_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/^https?:\/\//, "").replace(/\/+$/, ""))
  .filter(Boolean);

/**
 * Helper: extract hostname from an Origin header or from a host header.
 */
function hostnameFromOrigin(originHeader: string | null) {
  if (!originHeader) return "";
  try {
    // If originHeader is a full URL (e.g. "https://demo1.kabirstudios.com")
    return new URL(originHeader).hostname;
  } catch {
    // Fallback: strip protocol if present, then take part before ":" (port)
    return originHeader.replace(/^https?:\/\//, "").split(":")[0].replace(/\/+$/, "");
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authCookie = req.cookies.get("auth");

  // Keep this response object so we can set headers for some routes
  let response = NextResponse.next();

  // --- Redirect logged-in users away from login/signup ---
  if (authCookie && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // --- Protect dashboard routes ---
  if (pathname.startsWith("/dashboard")) {
    if (!authCookie) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  // --- Protect API routes ---
  if (pathname.startsWith("/api")) {
    // Always allow login/logout endpoints (public)
    if (pathname.startsWith("/api/login") || pathname.startsWith("/api/logout")) {
      return response;
    }

    // Require auth cookie for protected API routes
    if (!authCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CORS / origin enforcement: only check when browser sends Origin header.
    // If Origin is missing (SSR, same-site server requests, or some proxied requests),
    // we allow the request (because auth cookie already enforced above).
    const originHeader = req.headers.get("origin");
    const originHostname = hostnameFromOrigin(originHeader);
    const hostHeader = (req.headers.get("host") || "").split(":")[0]; // strip port

    // If ALLOWED_ORIGINS not configured, don't block based on origin (only rely on auth cookie)
    const allowedConfigured = ALLOWED_ORIGINS.length > 0;

    const isOriginAllowed = (() => {
      if (!allowedConfigured) return true; // no restriction configured
      if (!originHeader) {
        // No Origin header — treat as same-site / server-side; allow
        return true;
      }
      // Exact hostname match against normalized env
      if (ALLOWED_ORIGINS.includes(originHostname) || ALLOWED_ORIGINS.includes(hostHeader)) {
        return true;
      }
      // Looser substring match (handles things like "demo1.kabirstudios.com" vs "www.demo1...")
      if (ALLOWED_ORIGINS.some((a) => hostHeader.includes(a) || originHostname.includes(a))) {
        return true;
      }
      return false;
    })();

    if (!isOriginAllowed) {
      // return JSON so client won't crash trying to parse non-JSON
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard",
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
