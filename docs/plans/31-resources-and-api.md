# Plan 31 — Resources & the API Layer

## Hard constraint from Plan 30 — read before implementing anything

Published sites run on a **separate registrable domain** with **no platform
session cookie**. Plan 30 establishes two API surfaces that must never be
merged:

### Platform API

- **Audience:** dashboard, editor, publishing, asset management.
- **Origin:** app origin only (`APP_HOST`).
- **Authentication:** Lucia session cookie (`__Host-auth_session` in
  production).
- **Origin check:** reject requests whose `Origin` (or equivalent) is not
  the app origin. Published sites must never call these routes.
- **Examples:** portfolio CRUD, publish/unpublish, editor save, auth.

### App-runtime API

- **Audience:** record reads and writes issued by published pages (forms,
  actions, data sources).
- **Origin:** site origin only (`*.SITES_HOST`).
- **Authentication:** **never** the platform session cookie. App end-users
  are a separate identity space (Plan 35); until then, writes are
  anonymous, rate-limited, and validated against the resource definition.
- **Scope:** one published project per slug; every mutation revalidates
  server-side against the resource definition (ADR-012 §6).
- **Examples:** `POST/GET/PATCH/DELETE /api/apps/[slug]/records/[resource]`.

### The failure mode this prevents

> "Just read the session cookie — the user is right there."

A published page on the app origin can `fetch("/api/...")` with the
**visiting user's platform session** attached automatically. An author
could act as any logged-in visitor who opens their site. Splitting origins
removes that ambient authority; this rule keeps it from creeping back in
through a convenient shortcut during implementation.

**Enforcement:** Plan 31's own tests must assert that platform API routes
reject site-origin requests and that app-runtime routes ignore platform
session cookies.

---

## What Plan 30 actually shipped — reconcile before writing routes

Verified against the code on 2026-08-09, after Plan 30 landed. Three of
these contradict the stage sketches below; fix the proxy first, in its own
commit, or Stage 3 cannot work at all.

**1. `/api/*` returns 404 on the site origin — today.** `/api` is in
`PLATFORM_PATH_PREFIXES` (`lib/hosts.ts`), and `proxy.ts` 404s every
platform path on a site host. That was correct when no app-runtime API
existed. It now blocks the entire surface this plan is about.

**2. Removing it is not enough — the rewrite would mangle the path.**
Every non-platform path on a site host is rewritten to `/p/<slug>…`, so
`/api/apps/alice/records/messages` becomes
`/p/alice/api/apps/alice/records/messages`. The proxy needs an explicit
app-runtime branch that matches the API prefix and passes it through
*before* `siteOriginRewritePath` runs.

**3. The slug must come from the host, not the path.** `alice.sites.app`
posting to `/api/apps/bob/records/…` is a cross-tenant write with no
authentication in front of it, because app-runtime routes are anonymous by
design. Derive the slug from the subdomain (`extractSiteSlug`) and reject
any request whose path slug disagrees — or drop the slug from the path
entirely and let the host be the only source. **Prefer dropping it:** a
value that cannot be spelled cannot be spoofed. If the path keeps a slug,
the mismatch check is a hard test case, not a nicety.

**4. `connect-src` constrains where the runtime may call.** The site-origin
CSP is `default-src 'self'` with no `connect-src` override, so a published
page can `fetch` **same-origin only**. That is a feature: these pages are
author-controlled, and a widened `connect-src` is an exfiltration channel
out of every visitor's session. It forces one design decision — the
app-runtime API **must be served on the site origin**, under the page's own
subdomain. Serving it from the app origin or a shared API host would
require relaxing `connect-src` on author-controlled pages. Do not.

**5. Published pages are already dynamically rendered.**
`readPublishedStyleNonce` calls `headers()`, so `export const revalidate =
false` on the published route does not make it static. No caching work is
needed to make request-scoped API behaviour correct — but equally, do not
assume a page cache exists to lean on.

**6. Test the API from the site origin in a browser, not just with
`curl`.** `next.config.ts` needs `allowedDevOrigins: ["*.sites.localhost"]`
or the dev server silently ships no client runtime — pages render, and
every fetch the runtime would have issued simply never happens. Plan 30
Stage 2d has the detail.

---

## Objective

Prisma `Resource` + `Record`; resource definitions as project-level
document data; CRUD routes scoped to a published project; Zod validation
derived from the resource definition; per-project rate limiting;
spam/honeypot handling on public writes.

**Exit:** a resource defined in the builder is queryable and writable over
HTTP, with invalid and unauthorised writes rejected server-side.

## Context every agent must read first

- **[Plan 28](./28-application-layer-overview.md)** — sequence and scope.
- **[Plan 30](./30-origin-isolation.md)** — origin isolation and the
  two-API-surface rule above.
- **[ADR-012](../decisions/ADR-012-application-layer-bindings-and-actions.md)**
  — authorization is server-side only; document permissions are UI
  affordances, not gates.

## Depends on

- Plan 29 — runtime foundation (Binding, Action, client boundary).
- Plan 30 — origin isolation (this document's hard constraint).

## Stages

*(Stage 3 and 5 detailed below; stages 1, 2 and 4 still need deepening.)*

### Stage 1 — Prisma models

`Resource`, `Record`, indexes, idempotent migration.

### Stage 2 — Resource definitions in the document

Project-level `resources` array; validation; inspector surfacing.

### Stage 3 — App-runtime API routes

**3a. Proxy first, in its own commit.** Carve the app-runtime prefix out of
`isPlatformPath` and pass it through ahead of `siteOriginRewritePath`, so
the API is reachable on the site origin and still 404s on the app origin —
the mirror image of how `/p/` is handled. Ship this with tests before any
route exists; items 1–3 above are why.

**3b. Routes.** `GET/POST/PATCH/DELETE` record operations on the **site
origin**, scoped by the slug **from the host**. Zod schema derived from the
resource definition; rate limiting per project; honeypot/spam handling on
public writes; no platform session auth, and no reading of the session
cookie even where one happens to be present.

### Stage 4 — Platform API guardrails

Origin rejection for dashboard-only routes; confirm published pages cannot
reach platform mutations.

### Stage 5 — Tests

Beyond the obvious (invalid payloads rejected, rate limits enforced), these
four are the ones that encode Plan 30 and must not be dropped:

1. A platform API route rejects a request whose `Origin` is a site origin.
2. An app-runtime route ignores a platform session cookie sent with it —
   same result authenticated or not.
3. A request to `alice.<SITES_HOST>` cannot read or write `bob`'s records,
   however the slug is spelled in the path.
4. `/api/...` still 404s on the app origin, and platform paths still 404 on
   the site origin, after the Stage 3a proxy change.

## Out of scope

- App end-user identity (Plan 35)
- Full CORS design beyond the two-surface rule
- Custom domains per site

## Review

This plan and Plan 30 should both get `/security-review` before landing.
