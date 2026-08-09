import { getAppHost, getSitesHost } from "@/lib/hosts";

function normalizeOrigin(origin: string): string {
  return origin.toLowerCase().replace(/\/$/, "");
}

function siteOriginPattern(): RegExp {
  const sitesHost = getSitesHost().replace(/\./g, "\\.").replace(/:\d+$/, "(?::\\d+)?");
  return new RegExp(`^https?://[a-z0-9-]+\\.${sitesHost}$`, "i");
}

/** True when the Origin header is a published site origin (not the app origin). */
export function isSiteOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  const normalized = normalizeOrigin(origin);
  if (normalized === normalizeOrigin(`http://${getAppHost()}`)) {
    return false;
  }
  if (normalized === normalizeOrigin(`https://${getAppHost()}`)) {
    return false;
  }
  return siteOriginPattern().test(normalized);
}

export class PlatformOriginError extends Error {
  constructor(message = "Platform API is not available from this origin.") {
    super(message);
    this.name = "PlatformOriginError";
  }
}

/** True when the Origin header is exactly the app origin. */
export function isAppOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }
  const normalized = normalizeOrigin(origin);
  return (
    normalized === normalizeOrigin(`http://${getAppHost()}`) ||
    normalized === normalizeOrigin(`https://${getAppHost()}`)
  );
}

/**
 * Rejects any cross-origin request to the platform API.
 *
 * This is an allowlist, deliberately. Denylisting published site origins
 * blocks the case Plan 30 names and lets every other cross-origin caller
 * through — `Origin: https://attacker.example` reached this API with the
 * visitor's session cookie attached, which is CSRF against a
 * cookie-authenticated surface. Plan 31 specifies "reject requests whose
 * Origin is not the app origin"; this is that, literally.
 *
 * A missing Origin is allowed: same-origin navigations and server-to-server
 * calls omit it. Browsers always send it on cross-origin requests, which is
 * what this guards.
 */
export function assertPlatformOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin === null) {
    return;
  }
  if (!isAppOrigin(origin)) {
    throw new PlatformOriginError();
  }
}
