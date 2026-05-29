import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";

/**
 * Edge middleware cannot use Prisma/Lucia DB validation.
 * We only check that a session cookie exists; full validation runs in
 * server components and server actions via `getSession()` in `lib/auth.ts`.
 */
export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/new", "/editor/:path*"],
};
