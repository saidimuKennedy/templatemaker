import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import {
  appOriginPublishedRedirect,
  buildSiteOriginCsp,
  CSP_NONCE_HEADER,
  extractSiteSlug,
  generateCspNonce,
  getSitesHost,
  isEmbedInternalPath,
  isPlatformPath,
  isSiteHost,
  siteOriginRewritePath,
} from "@/lib/hosts";

const PROTECTED_PATH_PREFIXES = ["/dashboard", "/new", "/editor"] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function applySiteSecurityHeaders(
  response: NextResponse,
  internalPath: string,
  nonce: string,
): void {
  const embed = isEmbedInternalPath(internalPath);
  response.headers.set("Content-Security-Policy", buildSiteOriginCsp(nonce, embed));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

/**
 * Edge proxy cannot use Prisma/Lucia DB validation.
 * Protected app routes only check that a session cookie exists; full
 * validation runs in server components and server actions via `getSession()`.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  if (isSiteHost(host)) {
    const slug = extractSiteSlug(host);
    if (!slug) {
      return new NextResponse(null, { status: 404 });
    }

    if (isPlatformPath(pathname)) {
      return new NextResponse(null, { status: 404 });
    }

    const rewritePath = siteOriginRewritePath(slug, pathname);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = rewritePath;

    const nonce = generateCspNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(CSP_NONCE_HEADER, nonce);

    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    applySiteSecurityHeaders(response, pathname, nonce);
    return response;
  }

  // Everything that is not a published-site host is treated as the app origin,
  // including deployment domains the config does not name (*.vercel.app,
  // preview URLs, a bare IP). Falling through to next() for those served
  // published content on a platform origin with no CSP and no redirect —
  // defeating Stage 2c on every host except the one canonical APP_HOST.
  const publishedRedirect = appOriginPublishedRedirect(pathname);
  if (publishedRedirect) {
    const protocol = request.nextUrl.protocol;
    const sitesHost = getSitesHost();
    const destination = new URL(
      `${protocol}//${publishedRedirect.slug}.${sitesHost}${publishedRedirect.sitePath}`,
    );
    return NextResponse.redirect(destination, 301);
  }

  if (isProtectedPath(pathname)) {
    const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionId) {
      return redirectToLogin(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
