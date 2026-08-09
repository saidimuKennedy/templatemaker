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

*(Detailed stages to be written when Plan 30 lands.)*

### Stage 1 — Prisma models

`Resource`, `Record`, indexes, idempotent migration.

### Stage 2 — Resource definitions in the document

Project-level `resources` array; validation; inspector surfacing.

### Stage 3 — App-runtime API routes

`POST/GET/PATCH/DELETE /api/apps/[slug]/records/[resource]` on the **site
origin**; Zod validation from definition; rate limiting; no platform
session auth.

### Stage 4 — Platform API guardrails

Origin rejection middleware/tests for dashboard-only routes; confirm
published pages cannot reach platform mutations.

### Stage 5 — Tests

Invalid payloads rejected; cross-origin platform API calls rejected;
app-runtime routes ignore session cookies; rate limits enforced.

## Out of scope

- App end-user identity (Plan 35)
- Full CORS design beyond the two-surface rule
- Custom domains per site

## Review

This plan and Plan 30 should both get `/security-review` before landing.
