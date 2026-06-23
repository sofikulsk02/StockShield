import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't need authentication
  const isAuthPage = pathname === "/login";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") || // e.g. favicon.ico, images, etc.
    pathname === "/favicon.ico";

  if (isApiAuth || isStaticAsset) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookies
  const hasSession =
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token");

  // Check for Guest cookie
  const hasGuestCookie = request.cookies.has("stockshield_guest");

  const isAuthenticated = hasSession || hasGuestCookie;

  // If on login page and already authenticated, redirect to home
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If not on login page and not authenticated, redirect to login
  if (!isAuthPage && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  // Match all request paths except API routes that aren't auth related, static files, etc.
  matcher: [
    "/((?!api/(?!auth)|_next/static|_next/image|favicon.ico).*)",
  ],
};
