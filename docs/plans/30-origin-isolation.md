# Plan 30 — Origin Isolation for Published Sites

## Land this before Plan 31. It is a precondition, not a hardening pass.

## Objective

Move published output onto an origin that carries **no platform
credentials**, and establish that the platform API and the app-runtime API
are two separate, differently-authenticated surfaces.

This is cheap now and expensive later: Plan 31 gives public pages their
first write API, and Plan 29 gives them their first JavaScript. Both of
those are safe on an isolated origin and structurally unsafe on the
current one.

## Threat model — state it accurately

**There is no live vulnerability today.** Published pages ship zero
JavaScript, there are no API routes, and the Lucia session cookie
(`lib/auth.ts`) is `httpOnly` with no `domain` attribute, so it is
host-only and unreadable from page script. Nothing here is an incident
response.

What makes it a precondition is the next two plans:

- `/p/[slug]` and `/embed/[slug]` are **same-origin** with `/dashboard`,
  `/editor`, `/login`, and `auth_session`. The proxy matcher deliberately
  does not cover them — they are public, correctly.
- Plan 29 puts an author-controlled action runtime on those pages.
- Plan 31 adds `/api/...` record mutations. A `fetch` from a published
  page to that API is **same-origin and credentialed**: it carries the
  visiting user's platform session automatically. An author would be able
  to act as any logged-in visitor who opens their site.
- Independently: a published page is author-controlled content on the
  platform's origin. Any future HTML-embed component, or any XSS in any
  component, becomes an XSS against the platform and every tenant — not
  against one site.

The fix is architectural: **remove the ambient authority** by removing the
shared origin. Then the credentialed-fetch problem cannot exist, whatever
the runtime later allows.

## Context every agent must read first

- **[Plan 28](./28-application-layer-overview.md)** — sequence and scope.
- **[ADR-012](../decisions/ADR-012-application-layer-bindings-and-actions.md)**
  §6 — authorization is server-side only. This plan is what makes §6
  enforceable.
- **`AGENTS.md` — this is not the Next.js you know.** Verified for this
  version: **`middleware.ts` is deprecated and renamed to `proxy.ts`**
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).
  The repo still has a root `middleware.ts`. Read that doc and the proxy
  guide before touching routing — including the note that proxy code may
  be deployed to the CDN and **must not rely on shared modules or
  globals**, which constrains how host config is read.

## Hosting decision — settled

**Published sites are served from a separate registrable domain.**
Decided 2026-08-09 by the owner. Do not re-open this in implementation.

```
app origin     myapp.com            dashboard, editor, auth cookie, platform API
site origin    alice.mysites.app    published content, app-runtime API
```

The domains must share **no registrable suffix**. That is the whole point:
with no common parent domain, a published site cannot set a cookie the app
origin will ever receive, so isolation is structural rather than dependent
on a defensive convention holding forever.

**Rejected: wildcard subdomain (`*.sites.myapp.com`).** Free, but a
published site can set a `Domain=.myapp.com` cookie that the app origin
then receives — cookie injection against the platform's own auth, by any
tenant. The `__Host-` prefix defends against exactly that, which is why
Stage 1 keeps it as defence in depth, but a security property that depends
on one prefix never being dropped is not a property, it's a habit.

The actual domain names are deployment configuration (`APP_HOST`,
`SITES_HOST`), not hardcoded values. Nothing in the codebase should
contain either literal.

There must be exactly **one** origin serving published content. Leaving
`/p/[slug]` reachable on the app origin defeats the entire plan (Stage 2c).

---

## Stage 1 — Lock the session cookie (do first; independent of hosting)

`lib/auth.ts` currently sets only `secure`. Everything else is a Lucia
default, which makes the app's security properties implicit.

- Make attributes explicit: `httpOnly: true`, `sameSite: "lax"`,
  `path: "/"`, `secure` in production. Never set `domain` — add a comment
  saying so and why, because adding it later silently undoes this plan.
- Adopt the **`__Host-` prefix in production**: `__Host-auth_session`.
  Browsers reject any `__Host-` cookie carrying a `Domain` attribute, so
  no sibling or subdomain can shadow or inject it. Keep the unprefixed
  name in development, where `Secure` over `http://localhost` is not
  available — mirror the existing `process.env.NODE_ENV` pattern.
  This is **defence in depth**, not the primary control — the separate
  registrable domain is. Keep it anyway: it costs nothing and it is what
  protects the app origin if a future subdomain is ever added.
- `SESSION_COOKIE_NAME` (`lib/auth-cookie.ts`) is already the single
  shared constant between the proxy and Lucia. Keep it that way: derive
  the prefixed name there, not in two places.
- Test asserting the emitted `Set-Cookie` attributes, including the
  absence of `Domain`.

**Straight rename, no dual-read.** The owner confirmed (2026-08-09) there
are no live users whose sessions matter, so the cookie name changes in one
step and anyone currently logged in is logged out once. Do not build
backwards-compatible cookie reading for a compatibility problem that does
not exist.

**Exit:** login/logout work end to end; the emitted `Set-Cookie` carries
`__Host-` in a production build, no `Domain`, and the attribute test
passes.

---

## Stage 2 — Host-based routing

### 2a. Migrate `middleware.ts` → `proxy.ts`

Straight rename plus the export change per the version's docs. Preserve
the current behaviour exactly, in its own commit, before adding host
logic. Do not combine this with 2b.

### 2b. Route by hostname

Config via env, read per-request from the URL (not module globals):
`APP_HOST`, `SITES_HOST`.

- **Site host** → rewrite to the internal published route. The slug comes
  from the subdomain label (or, later, a custom-domain lookup — out of
  scope here). Requests for `/dashboard`, `/editor`, `/new`, `/login`,
  and any platform API path are **404 on this host**, not redirected.
- **App host** → unchanged behaviour for the existing matcher.

### 2c. One origin per concern

On the app host, `/p/[slug]` and `/embed/[slug]` return a **301 to the
site origin**. Published content must not be reachable on the app origin
at all. Existing shared links keep working through the redirect.

### 2d. Local development

The two-registrable-domain split has to be reproducible locally, or the
isolation only exists in production and every bug in it ships.

`*.localhost` resolves without hosts-file edits in current browsers, so
`localhost:3000` (app) and `alice.sites.localhost:3000` (sites) give two
distinct origins on one dev server. They share the `localhost` suffix,
which production deliberately does not — so **cookie-shadowing behaviour
cannot be tested locally**. Note that limitation next to the dev
instructions rather than letting a later reader conclude local parity is
complete.

`__Host-` is unavailable over plain http (Stage 1), so dev runs the
unprefixed cookie name. Same caveat: that specific defence is
production-only.

Document the dev URL shape and both caveats in the README.

**Exit:** `alice.sites.localhost:3000` renders the portfolio;
`localhost:3000/p/alice` 301s to it; `alice.sites.localhost:3000/dashboard`
404s.

---

## Stage 3 — Collapse `basePath`

`renderPublished` (`lib/builder/content.tsx:150`) derives
`basePath = "/p/${slug}"` so page links resolve inside the mount point.
On a dedicated origin the document is mounted at the root, so `basePath`
becomes `""`.

Keep the parameter — the editor preview and embed paths still need it —
and pass `undefined` from the site-origin render path. Update the doc
comment above `renderPublished`, which currently explains the `/p/<slug>`
reasoning and will otherwise be actively misleading.

Check `generateMetadata` in the published route for absolute-URL
assumptions at the same time.

**Exit:** a page link on a published site navigates to `/work`, not
`/p/slug/work`, and the existing `resolve-links` tests still pass.

---

## Stage 4 — Response headers on the site origin

Set in the proxy, applied only to the site host:

- **CSP.** Today published pages need no script at all; after Plan 29 they
  need only first-party runtime script. Start at `script-src 'self'`,
  `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`.
  The responsive stylesheet is injected inline via
  `<style dangerouslySetInnerHTML>` (`lib/builder/content.tsx:123`), so
  it needs a **nonce**, not `style-src 'unsafe-inline'`. Thread the nonce
  from the proxy through to that `<style>` tag.
- **`frame-ancestors`.** `'none'` for `/p`; the embed route exists to be
  framed, so it gets its own policy. Do not give both routes one policy.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Exit:** CSP violations are zero on a published portfolio, verified in a
browser console — not inferred.

---

## Stage 5 — Two API surfaces (the architectural output)

This stage is mostly a written contract that Plan 31 then implements. It
is the reason this plan exists.

- **Platform API** — the dashboard, editor, publishing. Cookie-authenticated,
  app origin only. Rejects requests whose `Origin` is not the app origin.
  Published sites can never call it.
- **App-runtime API** — record reads and writes issued by published pages
  (Plan 31). Served to the site origin, scoped to a single published
  project, and **never authenticated by the platform session cookie**. App
  end-users are a separate identity space from platform users (Plan 35
  builds it); until then, writes are anonymous, rate-limited, and
  validated against the resource definition.

Write this down in the plan file for 31 as a hard constraint. The failure
mode it prevents — "just read the session cookie, the user is right
there" — is the single most likely way this whole plan gets undone.

**Exit:** documented; enforced by Plan 31's own tests.

---

## Stage 6 — Update every URL the product emits

Dashboard "View site" / "Copy link", publish-success UI, embed snippet,
`generateMetadata` canonicals, and anything in `app/(dashboard)/` that
builds a `/p/${slug}` string. Grep for `/p/` and `/embed/` rather than
fixing the ones you remember.

**Exit:** no user-facing surface hands out an app-origin published URL.

---

## Out of scope

Custom domains per site (the subdomain lookup is written to accommodate
them later, but no domain-verification flow here) · app end-user identity
(Plan 35) · CORS design beyond the two-surface rule (Plan 31) · migrating
`Portfolio.slug` semantics — slugs stay unique and unchanged.

## Review

This plan and Plan 31 should both get `/security-review` before landing.
They are the two places where a public page becomes an authenticated
surface.
