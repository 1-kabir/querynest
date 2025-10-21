import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const DEMO_EMAIL = process.env.DEMO_EMAIL;
  const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const response = NextResponse.json({ message: "Login successful" });
    response.cookies.set({
      name: "auth",
      value: "true",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return response;
  }

  return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
}
