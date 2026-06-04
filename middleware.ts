import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthSecret, verifyAuthToken } from "@/lib/auth";

const publicPaths = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/constant-contact/callback",
]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (pathname === "/login" && (await isLoggedIn(request))) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (await isLoggedIn(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

async function isLoggedIn(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  return verifyAuthToken(token, getAuthSecret());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
