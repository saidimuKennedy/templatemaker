/** Request header set by the site-origin proxy rewrite (Plan 30). */
export const CSP_NONCE_HEADER = "x-csp-nonce";

const DEFAULT_APP_HOST = "localhost:3000";
const DEFAULT_SITES_HOST = "sites.localhost:3000";

function normalizeHost(host: string): string {
  return host.toLowerCase();
}

/** App origin host from deployment config (`APP_HOST`). */
export function getAppHost(): string {
  return process.env.APP_HOST ?? DEFAULT_APP_HOST;
}

/** Published-sites base host from deployment config (`SITES_HOST`). */
export function getSitesHost(): string {
  return process.env.SITES_HOST ?? DEFAULT_SITES_HOST;
}

/** Client-visible sites host (`NEXT_PUBLIC_SITES_HOST` mirrors `SITES_HOST`). */
export function getPublicSitesHost(): string {
  return process.env.NEXT_PUBLIC_SITES_HOST ?? getSitesHost();
}

export function isAppHost(host: string): boolean {
  return normalizeHost(host) === normalizeHost(getAppHost());
}

export function isSiteHost(host: string): boolean {
  const sitesHost = normalizeHost(getSitesHost());
  const normalized = normalizeHost(host);
  return normalized.endsWith(`.${sitesHost}`);
}

/** Subdomain label on the site host, e.g. `alice` from `alice.sites.localhost:3000`. */
export function extractSiteSlug(host: string): string | null {
  const sitesHost = getSitesHost();
  const suffix = `.${sitesHost}`;

  if (!host.toLowerCase().endsWith(suffix.toLowerCase())) {
    return null;
  }

  const slug = host.slice(0, host.length - suffix.length);
  if (!slug || slug.includes(".")) {
    return null;
  }

  return slug;
}

function requestProtocol(): "http" | "https" {
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

function joinOriginPath(origin: string, path: string): string {
  if (!path || path === "/") {
    return origin;
  }
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Public portfolio URL on the site origin. */
export function buildPublishedSiteUrl(slug: string, path = ""): string {
  const origin = `${requestProtocol()}://${slug}.${getSitesHost()}`;
  return joinOriginPath(origin, path);
}

/** Embeddable portfolio URL on the site origin. */
export function buildEmbedSiteUrl(slug: string, path = ""): string {
  const embedPath = path ? `/embed${path.startsWith("/") ? path : `/${path}`}` : "/embed";
  return buildPublishedSiteUrl(slug, embedPath);
}

/** Client-side published URL (uses `window.location.protocol`). */
export function buildPublishedSiteUrlClient(slug: string, path = ""): string {
  const origin = `${typeof window !== "undefined" ? window.location.protocol : "http:"}//${slug}.${getPublicSitesHost()}`;
  return joinOriginPath(origin, path);
}

/** Client-side embed URL (uses `window.location.protocol`). */
export function buildEmbedSiteUrlClient(slug: string, path = ""): string {
  const embedPath = path ? `/embed${path.startsWith("/") ? path : `/${path}`}` : "/embed";
  return buildPublishedSiteUrlClient(slug, embedPath);
}

const PLATFORM_PATH_PREFIXES = [
  "/dashboard",
  "/editor",
  "/new",
  "/login",
  "/signup",
  "/api",
] as const;

/** Platform-only paths that must 404 on the site origin. */
export function isPlatformPath(pathname: string): boolean {
  return PLATFORM_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Internal rewrite target for a request on the site origin. */
export function siteOriginRewritePath(slug: string, pathname: string): string {
  if (pathname === "/embed" || pathname.startsWith("/embed/")) {
    const rest = pathname === "/embed" ? "" : pathname.slice("/embed".length);
    return `/embed/${slug}${rest}`;
  }

  return pathname === "/" ? `/p/${slug}` : `/p/${slug}${pathname}`;
}

/** Whether the internal route is the embed surface (for framing policy). */
export function isEmbedInternalPath(pathname: string): boolean {
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

/** 301 target when `/p` or `/embed` is requested on the app origin. */
export function appOriginPublishedRedirect(
  pathname: string,
): { slug: string; sitePath: string } | null {
  const publishedMatch = pathname.match(/^\/p\/([^/]+)(\/.*)?$/);
  if (publishedMatch) {
    return {
      slug: publishedMatch[1]!,
      sitePath: publishedMatch[2] ?? "",
    };
  }

  const embedMatch = pathname.match(/^\/embed\/([^/]+)(\/.*)?$/);
  if (embedMatch) {
    const rest = embedMatch[2] ?? "";
    return {
      slug: embedMatch[1]!,
      sitePath: rest ? `/embed${rest}` : "/embed",
    };
  }

  return null;
}

export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildSiteOriginCsp(nonce: string, embed: boolean): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    // Node styles render as `style="..."` attributes (94 of them on a typical
    // page). A nonce whitelists <style> ELEMENTS only — attributes are governed
    // by style-src-attr, which inherits style-src and would block every one of
    // them, collapsing the layout while external CSS still loads.
    //
    // 'unsafe-inline' here cannot execute script (CSP3 dropped expression()),
    // and the content is author-authored on an isolated origin. The stricter
    // fix is to emit base styles into the nonce'd stylesheet keyed on
    // data-node-id, which buildResponsiveStylesheet already does for
    // breakpoints — see Plan 30 follow-up.
    "style-src-attr 'unsafe-inline'",
    embed ? "frame-ancestors *" : "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}
