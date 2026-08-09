# ADR-013: Documents Are Storage-Agnostic — Control Plane and Data Plane Are Separate

## Status

Proposed (2026-08-09)

Extends [ADR-012](./ADR-012-application-layer-bindings-and-actions.md) §5,
which introduced the generic record store and explicitly invited this
challenge: *"If applications are expected to be single-tenant and
self-hosted, per-app migrations become defensible. Flip it here, not
mid-plan."* This ADR answers that question without flipping it, and fixes
the property that keeps the answer reversible.

## Context

The builder has stopped being a static-site generator. As of Plan 31 a
published document can define a collection, and visitors to a published
site can write rows to it. The moment generated output creates, reads,
updates and deletes data, persistence and tenancy become first-class
concerns rather than implementation details.

**What exists today**, verified:

- `ResourceDefinition` (`builder/resources/types.ts`) contains
  `name, label, fields, honeypot, permissions`. It describes the *shape*
  of a collection.
- Records live in the platform's own Postgres as
  `AppRecord → Resource → Portfolio`, tenant-scoped by row.
- Storage is reached only through `lib/app-runtime/records.ts` and
  `syncResourcesForPortfolio`, both server-side. Prisma never enters a
  client bundle; Plan 30's origin split makes that structural rather than
  conventional.

In the standard control-plane/data-plane framing, the platform is the
**control plane** (users, projects, documents, component trees, resource
definitions, publish state) and the customer's operational data —
submissions, customers, invoices, employee records — is the **data
plane**. Today both live in one database. That is the conventional
multi-tenant SaaS starting point, and it is adequate.

It is also the model with the weakest isolation guarantees, which is not
theoretical here: a security review during Plan 31 found that
case-variant slugs could resolve across tenants, because a unique index
was queried case-insensitively. Row-scoped multi-tenancy is only as
strong as every lookup that implements it.

Two futures are foreseeable and neither is scheduled:

- **Customer-owned database.** A client says employee or financial data
  may not sit on our infrastructure. The generated application talks to
  their Postgres; we hold an encrypted connection secret and nothing else.
- **Dedicated database per customer.** We operate it, but their rows are
  not mixed with anyone else's.

Both are legitimate. Neither has a customer demanding it today. Designing
for all three now would cost real time against zero users.

## Decision

**Adopt exactly one model — platform-managed shared storage — and make
the document incapable of encoding that choice.**

### 1. A document declares shape, never location

A `ResourceDefinition` says what a collection looks like. It must never
carry a connection string, host, table name, endpoint, database
identifier, or any other value naming *where* data lives. This holds for
every document-level structure added later, including data sources
(Plan 33).

**This property is load-bearing, not stylistic.** Published documents are
authored by users and persist indefinitely. A destination baked into a
document is baked into every document authored before the change — and
migrating them is migrating user content, which is the expensive kind.
Keeping location out means adding a second storage model is a server-side
change against a fixed document format.

### 2. Actions name a resource, not a destination

An action that writes data references a resource **by name**. It does not
reference a table, an endpoint, or a connection. Resolution from name to
storage happens server-side, per request, using the tenant identity the
request already carries.

The shipped API already has this shape: `/api/records/[resource]` with the
project derived from the host, never the path. Plan 32's `submitForm`
inherits it.

### 3. Storage access stays behind one server-side seam

All reads and writes of application data go through
`lib/app-runtime/records.ts`. That module is the seam where a second
storage backend would be introduced. Nothing above it — renderer,
components, actions, API route handlers — may hold a storage assumption.

### 4. Credentials never cross to the client

The generated application's browser code never holds database
credentials. It calls its own origin's API; the API talks to storage.
This is already enforced structurally by Plan 30 and by Prisma being
server-only, and it does not weaken under any future storage model.

### 5. ADR-012 §5 stands — generic record store, no runtime DDL

Per-application Prisma models would mean a migration runner executing DDL
against a shared database, triggered by a user editing a field in a
browser. That remains a worse liability than the feature it buys.

Self-hosting does not by itself flip this. A self-hosted deployment is
still multi-project; single-tenancy is a property of a *deployment*, not
of the document model. If per-app schemas ever become desirable, they
become so because a deployment is genuinely single-tenant and operator-
managed — a different decision, made then, and cleanly available because
of §1.

## Consequences

- Plan 32 gains one hard constraint: no destination-shaped field in any
  document structure. Cheap to honour now, expensive to retrofit.
- Plan 33's `dataSources` must describe *what* data is wanted, not where
  from. The indirection it introduces is the natural home for a future
  storage selector.
- An author cannot read their own submissions from a published page,
  because `read` defaults to `"none"` after the Plan 31 security review.
  Viewing them is a **control-plane** concern: app origin, session
  authentication, scoped to the owner. It must not be solved by widening
  the data-plane permission. Plan 32 ships the minimal version.
- Tenant isolation remains an application-level invariant. Every lookup
  that resolves a tenant is security-critical; `mode: "insensitive"` must
  not reappear.
- We accept that the strongest isolation stories (customer-owned,
  dedicated-per-customer) are unavailable until built. That is a sales
  constraint, not an engineering debt, and it is recorded here so the
  answer to "can our data stay with us?" is "not yet, and here is the
  seam where it would land."

## What would flip this

A signed customer requiring data residency or contractual isolation. At
that point §1 and §3 are what make it a server-side project rather than a
document migration. If either has eroded by then, this ADR failed.
