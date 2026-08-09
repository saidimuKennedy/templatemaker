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
- **Examples:** `GET/POST /api/records/[resource]`,
  `GET/PATCH/DELETE /api/records/[resource]/[recordId]`. **As shipped, the
  slug is not in the path** — the proxy derives it from the subdomain and
  sets `x-site-slug`, so it cannot be spoofed by a caller. Earlier drafts
  of this plan wrote `/api/apps/[slug]/records/...`; that shape is
  superseded, see item 3 below.

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

**Status: met.** Verified 2026-08-09 against a real published resource on the
site origin, after applying the migrations (which had been written but never
run — the tables did not exist, so nothing on this path had ever executed):

| Case | Result |
|---|---|
| `GET` list, default permissions | 403 `Read access denied.` |
| `GET` list after opting into `read: "public"` | 200, returns the record |
| `POST` valid | 201, row persisted |
| `POST` invalid email / missing required field | 400 with per-field errors |
| `POST` with the honeypot filled | 204, **no row written** |
| Another tenant's origin, app origin, spoofed `x-site-slug` | 404 |

Two of those need the row count checked, not the status code: the honeypot
returns success to the bot while persisting nothing, and the 403 is the
default doing its job rather than a broken endpoint — proved by flipping the
same resource to `read: "public"` and getting the data back.

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

*Written against the shipped implementation, not a forecast. Where a stage
records a decision that was reversed during review, the reversal is kept —
the reasoning is the part worth inheriting.*

### Stage 1 — Prisma models

Two models, both cascading from `Portfolio` so deleting a project leaves no
orphaned application data (verified: deleting a project with records drops
both tables' rows to zero).

```prisma
model Resource {
  id          String   @id @default(cuid())
  portfolioId String
  name        String
  definition  Json                       // the ResourceDefinition, as published
  portfolio   Portfolio @relation(..., onDelete: Cascade)
  records     AppRecord[]
  @@unique([portfolioId, name])          // the tenant-scoping constraint
  @@index([portfolioId])
}

model AppRecord {
  id         String   @id @default(cuid())
  resourceId String
  data       Json                        // validated payload, schema-less at rest
  resource   Resource @relation(..., onDelete: Cascade)
  @@index([resourceId])
  @@index([resourceId, createdAt])       // serves the default newest-first list
}
```

**The model is named `AppRecord`, not `Record`.** `Record` is a TypeScript
built-in utility type; a Prisma model of that name collides with it in every
file that imports both. Do not "fix" this back.

`@@unique([portfolioId, name])` is what makes `ensureResourceRow` an upsert
rather than a lookup-then-insert race, and it is the reason a resource name
only has to be unique *within* a project.

`definition` stores the published `ResourceDefinition` verbatim. The document
remains the source of truth; this column is the published snapshot the API
validates against, so an unpublished edit cannot change what the live API
accepts.

Migration: `prisma/migrations/20260809120000_add_resource_and_record`.

### Stage 2 — Resource definitions in the document

`BuilderProject.resources?: readonly ResourceDefinition[]` — optional, so
every existing document stays valid with no migration.

**Types** (`builder/resources/types.ts`):

- `ResourceFieldType`: `string | text | number | boolean | email`. Small on
  purpose — this is the minimum the CRM slice needs, not a field catalogue.
- `ResourceField`: `{ name, type, label?, required? }`.
- `ResourceAccess`: `"public" | "none"`. There is no third state until Plan 35
  introduces identity; "none" currently means "nobody over HTTP".
- `ResourceDefinition`: `{ name, label?, fields, honeypot?, permissions? }`.
- `DEFAULT_RESOURCE_PERMISSIONS`: **`create: "public"`, `read/update/delete:
  "none"`.** Read defaults closed — see the security note below.
- Resource names match `/^[a-z][a-z0-9_-]{0,63}$/`; they appear in URLs.

**Validation** (`builder/resources/validate.ts`) — `validateResources`
enforces name pattern, field shape, and **duplicate names within a project**.
Wired into document validation via `validateDocumentResources`
(`builder/document/validate.ts:83`), so it runs on save *and* publish rather
than only at the editor boundary.

**Zod derivation** (`builder/resources/zod-schema.ts`) — `buildRecordZodSchema`
maps fields to a Zod object and calls **`.strict()`**. That is the
mass-assignment defence: keys not in the definition are rejected outright, so
a caller cannot smuggle extra JSON into `AppRecord.data`. Non-required fields
become `.optional()`; `email` becomes `z.string().email()`.

**Editing** — `UpsertResource` / `DeleteResource` commands in
`builder/history/commands.ts`, so resource edits are undoable like any node
edit and carry a proper inverse. Surfaced as the **Data** tab
(`components/editor/ResourcesPanelEditor.tsx`), including an explicit
**Public read access** toggle that states the consequence.

**Publish sync** — `syncResourcesForPortfolio`
(`app/(dashboard)/editor/[id]/_actions.ts:207`) upserts definitions and
deletes rows whose names no longer exist in the document, inside one
transaction. Records survive a definition edit; they are dropped only when the
resource itself is removed.

> **Security — the read default is load-bearing.** An earlier revision
> defaulted `read` to `"public"`, which made every record of every resource
> listable by anyone at `GET /api/records/<name>` with no auth. For the
> archetypal contact form that is an unauthenticated dump of every
> submission's name, email, and message. Public read is now opt-in and
> labelled. When Plan 35 lands, `"none"` should split into real role-scoped
> access rather than being widened back.

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

`lib/platform-api/origin.ts` — `assertPlatformOrigin(request)`, which every
platform route must call before handling anything. `app/api/platform/ping`
is the reference implementation and the live proof; it throws
`PlatformOriginError`, which the route maps to **403**.

**It is an allowlist, and that distinction is the whole stage.** The first
implementation denylisted published site origins: it blocked the case Plan 30
names and let every *other* cross-origin caller through, so
`Origin: https://attacker.example` reached the API with the visitor's session
cookie attached — CSRF against a cookie-authenticated surface. The rule is
Plan 31 line 15 taken literally:

| `Origin` header | Result |
|---|---|
| absent | allow — same-origin navigations and server-to-server omit it |
| exactly `APP_HOST` (http or https) | allow |
| anything else | **403** |

A missing `Origin` is allowed deliberately: browsers always send it on
cross-origin requests, which is the case being guarded. Rejecting absence
would break same-origin navigation for no gain.

**Tenant isolation is the other half of this stage**, and it lives in the
lookup rather than the route. `Portfolio.slug` is unique but Postgres unique
indexes are case-sensitive, so `acme` and `Acme` could coexist while a
case-insensitive `findFirst` matched both and returned an arbitrary row —
serving one tenant's records from another tenant's origin. Slugs are now
normalized to lowercase on write, resolved with `findUnique` via
`findPublishedPortfolioBySlug` (`lib/slug.ts`), and folded on the way in by
`extractSiteSlug` and `appOriginPublishedRedirect`. **No `mode: "insensitive"`
lookup may be reintroduced anywhere** — that flag is what turned a unique
index into a non-boundary. Inbound folding is also what keeps pre-existing
mixed-case published links working after
`20260809140000_normalize_portfolio_slugs`.

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
