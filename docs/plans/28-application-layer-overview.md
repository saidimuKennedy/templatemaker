# Plan 28 — The Application Layer (Master Plan)

## Read this before Plans 29–37. It is the map; they are the territory.

## Objective

Take the engine from *"renders a document"* to *"runs an application"* —
with the proof being one complete vertical slice: **a working Customer
CRM built entirely in the builder.**

Everything in Plans 29–37 exists to serve that slice. Anything that does
not serve it is deferred, listed at the bottom, and left unplanned on
purpose.

## Governing decision

**[ADR-012](../decisions/ADR-012-application-layer-bindings-and-actions.md)
is binding on every plan in this set.** Read it first. Its four contracts
— Binding, Action, scoped client runtime, runtime-values-are-not-document-state
— are settled; plans implement them, they do not relitigate them.

Two rules from ADR-012 that plans get wrong if they skim:

1. **Existing portfolios must keep shipping zero JavaScript.** The client
   runtime mounts only when a page actually contains interactivity. If a
   plan makes every published page load a runtime bundle, that plan is
   wrong regardless of how well the feature works.
2. **The document declaring a permission is a UI affordance, never an
   authorization check.** Every mutation revalidates server-side.

## Current state — what exists, verified

| Layer | State |
|---|---|
| Document model | `BuilderNode { id, type, name?, props, styles, children }`, pages, project. `NodeProps` is `Record<string, unknown>` — bindings need **no contract change**. |
| Registry | 14 presentational components. `Interaction` category declared, nothing registered under it. |
| Renderer | `builder/renderer/renderer.tsx` — pure `document → ReactElement`. No event or data surface in `ComponentRenderer`. |
| Client JS | **None.** Zero `"use client"` in `builder/`. |
| Styles | Real `@media` stylesheet via `buildResponsiveStylesheet`. Runtime-authored CSS, not Tailwind — keep it that way. |
| Publishing | DB-backed server render at `app/p/[slug]/[[...path]]/page.tsx`, `revalidate = false`. Not a static export. |
| API | **No route handlers exist anywhere in `app/`.** |
| Database | `User`, `Session`, `Portfolio`, `Asset`. No application data. |
| Commands/history | Complete and tested. All document edits already go through it — reuse, never bypass. |

## The sequence

Each plan is independently demoable and lands in order. Later plans
assume earlier ones; **do not parallelise 29 with anything.**

```
29  Runtime foundation      Binding + Action contracts, scoped client runtime
        ↓
30  Origin isolation        Published sites off the platform origin, cookie lockdown
        ↓
31  Resources & API         Prisma Resource/Record, CRUD routes, server-side validation
        ↓
32  Forms & inputs          Declarative form schema, validation, submitForm → createRecord
        ↓
33  Data sources & binding  Fetch, cache, resolve $bind, loading/empty/error states
        ↓
34  DataTable               Columns, sort, filter, paginate, search, row actions
        ↓
35  Identity & access       Current user/org/role bindings, server-enforced permissions
        ↓
36  App routing             Dynamic segments, route params as bindings
        ↓
37  Vertical slice sign-off Customer CRM, end to end, as acceptance
```

### Why this order

- **29 first, always.** Bindings and actions are the two abstractions
  that prevent a renderer redesign per feature. Building `Form` before
  them means rebuilding `Form`.
- **30 before any API route exists.** Published pages are same-origin with
  `/dashboard` and the session cookie. The moment public pages gain both a
  client runtime (29) and a write API (31), a `fetch` from an authored
  page carries the visiting user's platform session. Isolating the origin
  after that means retrofitting security around live tenants.
- **31 before 32.** A form that submits nowhere cannot be verified. With
  the record store landed, the first form is demonstrably real on day one.
- **32 (write) before 33 (read).** Creating a record produces the data
  that binding and the table then display. The reverse order needs seed
  fixtures to show anything.
- **35 after 34.** Permissions gate UI that must already exist. Gating
  nothing is untestable.
- **36 late.** `/customers/:id` is only meaningful once there is a list to
  click through from.

## Per-plan scope

Each is expanded into its own file as the preceding plan lands — written
against the code that actually exists then, not against a forecast.

### 29 — Runtime foundation *(detailed: `29-runtime-bindings-and-actions.md`)*
`Binding` and `ActionStep` types; `builder/bindings/` resolver; a
`builder/actions/` interpreter; `runtime?: "server" | "client"` on
`ComponentDefinition`; the mount-only-if-needed rule.
**Exit:** a Button with `events.onClick = [{ type: "notify" }]` fires on a
published page, and a portfolio without events still ships zero JS.

### 30 — Origin isolation *(detailed: `30-origin-isolation.md`)*
Published sites moved to a dedicated origin carrying no platform
credentials; explicit `__Host-` session cookie; `middleware.ts` → the
version's `proxy.ts` convention with host-based routing; CSP with a nonce
for the injected stylesheet; and the two-API-surface rule that Plan 31
must obey.
**Exit:** published content is unreachable on the app origin, and the
platform session cookie cannot be shadowed or read from a published page.

### 31 — Resources & the API layer
Prisma `Resource` + `Record`; resource definitions as project-level
document data; `POST/GET/PATCH/DELETE /api/apps/[slug]/records/[resource]`;
Zod validation derived from the resource definition; per-project rate
limiting; spam/honeypot handling on public writes.
**Exit:** a resource defined in the builder is queryable and writable over
HTTP, with invalid and unauthorised writes rejected server-side.

### 32 — Forms & inputs
`Form`, `Input`, `Textarea`, `Select`, `Checkbox`, `SubmitButton` — the
minimum for the slice, not the full catalogue. Declarative field schema,
required/type validation, `form.values.*` and `form.errors.*` binding
scopes, `submitForm` → `createRecord`, success/error handling.
**Exit:** "Add Customer" creates a real row and shows real validation
errors.

### 33 — Data sources & data binding
`dataSources` on the project/page; fetch + cache + refetch; `$bind`
resolution against data, route, form, and user scopes; the loading /
empty / error contract for every data-driven component.
**Exit:** a Text node bound to `customers.count` renders the true count
and degrades visibly, not blankly, when the fetch fails.

### 34 — DataTable
A data grid, kept strictly separate from the layout `Grid`: columns,
sorting, filtering, pagination, search, row selection, row actions,
column visibility, and the three states from 33.
**Exit:** the customer list is searchable, sortable, and paginated over
real records.

### 35 — Identity & access
`user.*` / `org.*` binding scopes; roles and `resource.action`
permissions; `visibleWhen` conditions on nodes; **server-side enforcement
in the API layer as the actual gate**.
**Exit:** a viewer-role user cannot delete a customer — verified by
calling the API directly with the button hidden, not by the button being
hidden.

### 36 — App routing
Dynamic page paths (`/customers/:customerId`), `route.params.*` bindings,
detail pages fetching by param.
**Exit:** clicking a row opens a detail page rendering that record.

### 37 — Vertical slice sign-off
Build the Customer CRM in the builder UI with no hand-written code:
list (search/filter/sort/paginate) → add → detail → edit → delete.
Documented gaps become the input to the next planning round.
**Exit:** the slice works, and the walkthrough is reproducible by someone
who did not build it.

## Explicitly deferred

Not "never" — **not now**, and not to be smuggled into 29–37:

Workflows and approval chains · charts, KPI cards, gauges, activity feeds
· file uploads and document management · email/webhook notifications ·
multi-select, radio, switch, date picker, number, search, hidden fields ·
an expression language for bindings · GraphQL and external API sources ·
per-resource typed Prisma tables · offline/optimistic updates · a
static-HTML export target.

Each becomes a variation on the same primitives once the slice proves
them. Adding any of them before that is how a six-month rewrite starts.

## Standing risks

- **Two products, one engine.** The static portfolio builder and the app
  builder now share a document model. Every plan states what it does to
  the zero-JS path.
- **Public pages become an API surface.** Plans 30, 31 and 35 carry real
  security weight and should get `/security-review` before landing, not
  after.
- **Editor complexity.** The Inspector currently edits props and styles.
  Bindings, events, and data sources are three new editing surfaces; if
  they land as raw JSON textareas the feature is technically present and
  practically unusable. Each plan owns its editing UI.
- **Scope pressure.** The deferred list is the plan's load-bearing wall.
  Moving an item off it requires saying which plan grew and by how much.
