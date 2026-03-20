import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication (create/edit pages)
const protectedPaths = ["/members/new"];
const protectedPatterns = [/^\/members\/[^/]+\/edit$/];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page, API routes, and static assets
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check if route is a protected write route
  const isProtected =
    protectedPaths.includes(pathname) ||
    protectedPatterns.some((p) => p.test(pathname));

  if (!isProtected) {
    // All read-only routes are public
    return NextResponse.next();
  }

  // Protected routes require auth
  const authCookie = request.cookies.get("fame-auth");
  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
