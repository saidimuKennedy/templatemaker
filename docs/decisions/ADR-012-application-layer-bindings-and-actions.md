# ADR-012: The Application Layer — Bindings, Actions, and a Scoped Client Runtime

## Status

Proposed (2026-08-09)

## Context

The engine renders documents. It does not run applications.

Concretely, as of this ADR:

- Every component registered by `registerBuiltInComponents`
  (`builder/components/index.ts`) is presentational. The `Interaction`
  category exists in `ComponentCategory` (`builder/registry/types.ts`)
  and nothing is registered under it.
- `ComponentRenderer` is typed `(id, props, children) => ReactNode`. There
  is no event, action, or data surface anywhere in the contract.
- There is **no `"use client"` anywhere in `builder/`**. Published pages
  (`app/p/[slug]/[[...path]]/page.tsx`, `revalidate = false`) are pure
  server-rendered HTML plus a `<style>` sheet. They ship zero JavaScript.
- The app has **no API routes at all** (`find app -name route.ts` is
  empty). Every mutation today goes through server actions owned by the
  editor, not by published documents.
- Prisma knows `User`, `Session`, `Portfolio`, `Asset`. There is no
  concept of application data.

The requested direction — forms, CRUD, tables, dashboards, CRMs — is not
a pile of new components. It is a missing layer. Adding a `Form`
component without deciding where state lives, how a prop gets its value
from data, and what a button click *means* would force a renderer
redesign on every subsequent feature.

## Decision

Introduce an application layer built on **four** contracts, added
additively per ADR-008. Ship the contracts before the components.

### 1. Binding — a prop value may be an expression, not a literal

`NodeProps` is already `Record<string, unknown>`, so this requires **no
change to the document contract**. A bound prop is a tagged object:

```ts
export interface Binding {
  readonly $bind: string;      // "customers.rows", "route.params.id", "form.values.email"
  readonly fallback?: unknown;  // used while loading, on error, or when unresolved
}
```

Resolution is a new pure layer, `builder/bindings/`, that runs **between**
the document and the renderer:

```
document → resolveBindings(node, scope) → resolved props → renderer
```

The renderer keeps its current signature and stays pure. It never learns
what a binding is. This is what protects CONTRIBUTING rule 7.

Binding paths are resolved against a **scope**, never against arbitrary
JavaScript. No `eval`, no expression language in v1 — dotted paths plus a
small, closed set of formatters. An expression language can be added
later behind the same `$bind` tag; starting with one is a security and
scope trap.

### 2. Action — an event handler is data, not a function

`BuilderNode` gains one optional field:

```ts
readonly events?: Readonly<Record<EventName, readonly ActionStep[]>>;
```

`ActionStep` is a discriminated union (`navigate`, `submitForm`,
`createRecord`, `updateRecord`, `deleteRecord`, `refetch`, `setVariable`,
`openModal`, `closeModal`, `notify`). Steps run in sequence; each may
carry a `when` condition. Absent `events` means exactly today's
behaviour, so every existing document stays valid and unchanged.

Actions are interpreted by a runtime. They are never compiled to
JavaScript stored in the document, and the document never carries
executable code.

### 3. Scoped client runtime — interactivity is opt-in per component

`ComponentDefinition` gains:

```ts
readonly runtime?: "server" | "client";  // default "server"
```

A page mounts the client runtime **only if its tree contains at least one
`runtime: "client"` component, binding, or event**. Existing portfolios
contain none, so they keep shipping zero JavaScript. This is the property
that lets an application builder and a static site builder share one
engine, and it must not be traded away for implementation convenience.

### 4. Runtime values are not document state

The document is the source of truth for the **application definition** —
which variables exist, which data sources exist, what a button does. It
is *not* the store for runtime values. A half-typed email address is not
document state, does not serialize, and does not enter undo history.

This is the precise reading of CONTRIBUTING rule 1 for this layer, and it
needs stating because the naive reading ("no state outside the document")
would make forms impossible.

### 5. Application data is a generic record store

A new `Resource` (schema) and `Record` (row, JSON payload) pair in Prisma,
scoped to a project. **Not** per-application Prisma models.

Per-app models would need a migration runner executing DDL at runtime
against a shared multi-tenant database, triggered by an end user editing
a field in a browser. That is a database-integrity and security liability
far larger than the feature it buys. Typed columns can come later via a
per-resource projection table if query performance demands it.

**This is the decision most worth challenging.** If applications are
expected to be single-tenant and self-hosted, per-app migrations become
defensible. Flip it here, not mid-plan.

### 6. Authorization is server-side only

The document declares intent — "hide this button unless
`user.permissions` includes `customers.delete`". That declaration is a
**UI affordance and nothing more**. Every record mutation revalidates
identity, role, and field-level write access on the server, against the
resource definition, ignoring anything the client asserts.

Published pages are public URLs. A client runtime that can emit
`deleteRecord` is an authenticated API surface, and it must be reviewed
as one.

## Consequences

- The renderer, registry, and command API keep their current shapes.
  Bindings resolve before rendering; actions attach as data; the client
  runtime is a wrapper, not a rewrite.
- Existing portfolio documents are untouched and keep shipping no JS.
  `schemaVersion` does not bump (ADR-008 rule 2).
- Every data-driven component must handle loading, empty, and error
  states. This becomes part of the component contract, not an afterthought
  per component.
- New surface area needs its own review: `builder/bindings/`,
  `builder/actions/`, `builder/runtime/`, `builder/resources/`, and the
  first API routes the app has ever had.
- Scope discipline is delegated to the plans. ADR-012 authorises the four
  contracts and the record store. It does **not** authorise workflows,
  charts, an expression language, or file uploads; those need their own
  argument once the vertical slice in Plan 37 proves the foundation.

Related: [ADR-001](./ADR-001-document-is-source-of-truth.md),
[ADR-002](./ADR-002-react-is-the-primary-renderer.md),
[ADR-008](./ADR-008-additive-document-evolution.md).
