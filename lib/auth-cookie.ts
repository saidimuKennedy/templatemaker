const SESSION_COOKIE_BASE_NAME = "auth_session";

/**
 * Edge-safe session cookie name (must match `lib/auth.ts` Lucia config).
 * Production uses the `__Host-` prefix so browsers reject any `Domain`
 * attribute — defence in depth alongside separate registrable domains
 * (Plan 30). Development keeps the unprefixed name because `__Host-`
 * requires `Secure`, which plain http://localhost cannot satisfy.
 */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? `__Host-${SESSION_COOKIE_BASE_NAME}`
    : SESSION_COOKIE_BASE_NAME;
