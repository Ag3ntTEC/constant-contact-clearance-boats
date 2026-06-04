import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_SECONDS,
  createAuthToken,
  getAuthSecret,
} from "@/lib/auth";

export async function POST(request: Request) {
  const configuredPassword = process.env.APP_LOGIN_PASSWORD;
  const authSecret = getAuthSecret();

  if (!configuredPassword || !authSecret) {
    return NextResponse.json(
      { error: "Login is not configured yet. Add APP_LOGIN_PASSWORD and AUTH_COOKIE_SECRET." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };

  if (body.password !== configuredPassword) {
    return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  const token = await createAuthToken(authSecret);

  response.cookies.set({
    httpOnly: true,
    maxAge: AUTH_SESSION_SECONDS,
    name: AUTH_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: token,
  });

  return response;
}
