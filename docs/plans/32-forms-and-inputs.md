# Plan 32 — Forms & Inputs

## Objective

Give the builder the ability to **produce** the write that Plan 31 made
possible. Six components, one new action, one binding scope, and the
first document structure that describes behaviour with state rather than
structure.

**Exit:** "Add Customer" creates a real row and shows real validation
errors — and the author can see the rows it created.

## Context every agent must read first

- **[Plan 28](./28-application-layer-overview.md)** — the map. This plan
  is the first half of "write before read": 32 creates the data that 33
  binds and 34 tables.
- **[ADR-012](../decisions/ADR-012-application-layer-bindings-and-actions.md)**
  — binding, action, scoped client runtime, runtime-values-are-not-
  document-state. Binding on every plan in this set.
- **[ADR-013](../decisions/ADR-013-storage-agnostic-documents.md)** — the
  document declares shape, never location. Constraint 1 below is this ADR.
- **[Plan 31](./31-resources-and-api.md)** — the API this plan calls, and
  the two-surface rule it must obey.
- **`AGENTS.md`** — this is not the Next.js you know.

## Depends on

Plans 29, 30, 31 — all landed and verified. The migrations are applied and
Plan 31's exit criterion is met; the API this plan targets is live and
exercised.

---

## Hard constraints

### 1. No destination in the document (ADR-013)

`submitForm` names a **resource**. No field in any document structure this
plan adds may carry a table name, endpoint, URL, connection, or database
identifier. A published document must remain valid if the platform later
stores its records somewhere else entirely.

If a reviewer sees `destination`, `endpoint`, `table`, or `url` in a
document type added here, the design is wrong.

### 2. Zero-JS survives

A portfolio with no form still ships no JavaScript. `pageNeedsRuntime`
already gates the client runtime; extend its detection to form nodes
rather than mounting the runtime unconditionally. This is ADR-012's rule
and Plan 28 restates it: *a plan that makes every published page load a
runtime bundle is wrong regardless of how well the feature works.*

Verify by fiber count on a form-free published page, not by inspection —
a page can look correct while shipping a runtime it never uses, and the
inverse (see Plan 30) is equally invisible.

### 3. The server is the gate

Client-side validation is a convenience. `buildRecordZodSchema().strict()`
on the server is the authority, and it already rejects unknown keys. No
client validation result may be trusted, and no field may bypass the
server schema.

---

## Stages

### Stage 1 — The `submitForm` action

`ActionStep` is a discriminated union of `navigate | setVariable | notify
| openModal | closeModal` (`builder/actions/types.ts`). Add one member:

```ts
{
  readonly type: "submitForm";
  readonly resource: string;      // resource NAME — never a destination
  readonly onSuccess?: readonly ActionStep[];
  readonly onError?: readonly ActionStep[];
}
```

Three places must change together, and the third is the one that gets
missed:

1. `builder/actions/types.ts` — the union member and `ACTION_STEP_TYPES`.
2. `builder/actions/interpret.ts` — a `submitForm` case, plus
   `submitForm` on the `ActionRuntime` interface.
3. `builder/document/validate-events.ts` — validation for the new step.
   Skipping this lets a malformed document through document validation and
   fail at runtime instead of at save.

`onSuccess` / `onError` nest existing steps, so "create the record, then
notify, then navigate" composes from what Plan 29 already built rather
than inventing form-specific success handling.

### Stage 2 — The `form` binding scope

`BindingScope.form` already exists (`builder/bindings/resolve.ts:8`) as a
flat `Record<string, unknown>`. Plan 28 calls for `form.values.*` and
`form.errors.*`. **Settle the shape here** — every binding authored after
this plan depends on it:

```
form.values.<field>    current input value
form.errors.<field>    validation message, or undefined
form.submitting        boolean
form.submitted         boolean
```

Structured, not flat. `form.values.email` and `form.errors.email` must be
addressable independently, which a flat record cannot express without
prefix collisions against a field literally named `errors`.

Per ADR-012 §4, none of this is document state. It lives in the client
runtime for the lifetime of the interaction and is never written back to
the document.

### Stage 3 — Components

`Form`, `Input`, `Textarea`, `Select`, `Checkbox`, `SubmitButton`.
Registered under the `Interaction` category, which has been declared and
empty since ADR-012 — these are its first inhabitants.

**The minimum for the slice, not a catalogue.** No `Radio`, no
`FileUpload`, no date picker. `FileUpload` in particular drags in asset
storage, size limits, and content scanning; it is a plan of its own.

- `Form` declares `resource` and owns the runtime state for its subtree.
- Inputs declare a `field` name, which maps to a field on that resource.
- `SubmitButton` triggers the form's `onSubmit` action list.

Each needs a server renderer *and* a client renderer, following the
`button.tsx` / `button-view.tsx` / `button-client.tsx` split so the markup
is shared and only the interactive variant is a client component.

### Stage 4 — Validation feedback without shipping a validator

**Decision: no Zod in the published bundle.** Two mechanisms instead:

1. **Native constraint attributes**, derived from the field type —
   `required`, `type="email"`, `type="number"`. The browser gives
   pre-submit feedback for free, in zero bytes, and it works before
   hydration.
2. **Server errors are authoritative.** The 400 from Plan 31 already
   returns `details.fieldErrors` keyed by field name. Map that response
   directly onto `form.errors.*`.

The alternative — reusing `buildRecordZodSchema` client-side — sounds
better because it is one source of truth, but it ships a schema validator
to pages whose entire value proposition is shipping nothing, to duplicate
a check the server must repeat anyway. The response shape from Plan 31
was designed to be mapped onto a form; use it.

Plan 28's exit ("shows real validation errors") is satisfied by real
server errors. That is not a compromise — it is the more honest version,
because the errors displayed are the ones that actually rejected the write.

### Stage 5 — Activate the honeypot

`ResourceDefinition.honeypot` is fully implemented server-side and
currently unreachable, because nothing renders the field. `Form` must emit
it when the resource declares one:

- visually hidden, but **not** `display: none` or `hidden` — bots skip
  those; position it off-screen
- `tabindex="-1"` and `autocomplete="off"` so humans never focus or
  autofill it
- never bound, never shown in the inspector

The server already returns **204 with no row written** when it is filled.
The form must treat 204 as success — the bot must not learn it was
detected.

### Stage 6 — Rate-limit handling

Writes are limited to 30/min per project
(`APP_RUNTIME_RATE_LIMITS`), and the API returns **429 with
`Retry-After`**. Define the behaviour rather than discovering it:
`SubmitButton` disables for the retry window and the form surfaces a
distinct message. A 429 is not a validation error and must not render as
one.

### Stage 7 — Submissions viewer (control plane)

Without this, an author builds a contact form, receives submissions, and
has no way to read them — the only workarounds being to open
`read: "public"`, which re-creates the vulnerability the Plan 31 review
closed, or to query the database by hand.

A read-only list of records per resource, in the editor's **Data** tab.

**This is a platform-API surface, and the distinction is the point**
(Plan 30 Stage 5, ADR-013 §"Consequences"):

- app origin, **not** the site origin
- session-authenticated, scoped to portfolios the session user owns
- `assertPlatformOrigin` before anything else
- reached through `lib/app-runtime/records.ts`, never Prisma directly, so
  it keeps working if storage moves (ADR-013 §3)

Read-only. Export, delete, and search are Plan 34's problem.

### Stage 8 — Authoring-time validation

A form whose input declares `field: "emial"` against a resource with
`email` must be a **document validation error surfaced in the editor**,
not a 400 discovered after publish. `validateResources` already runs on
save and publish via `validateDocumentResources`; extend document
validation to cross-check form/input nodes against the resource they name.

Also validate that a `Form` names a resource that exists, and that
`submitForm` targets the enclosing form's resource.

---

## Exit criteria

Verified in a browser on a published site origin, with an app-origin
control — the Plan 30 lesson is that headers and markup both pass while
the page is functionally dead:

1. A form authored in the builder creates a real `AppRecord` row.
2. An invalid submission shows per-field errors from the server response.
3. A form-free published page still reports **zero React fibers**.
4. A filled honeypot returns success to the client and writes **no row**
   — verified by row count, not status code.
5. Exceeding the rate limit shows the retry message, not a validation
   error.
6. The author sees the submitted rows in the Data tab, with `read` still
   `"none"`.
7. A form referencing a missing field fails validation at save.

## Out of scope

`Radio`, `FileUpload`, date/time inputs · multi-step forms · file storage
· reading records on the published site (Plan 33) · tables, search,
pagination, export (Plan 34) · end-user identity and per-role permissions
(Plan 35) · `updateRecord` / `deleteRecord` actions — this plan is create
only, matching Plan 28's write-before-read ordering.

## Review

`/security-review` before landing. This plan puts a public, unauthenticated
write path into the hands of every published document, and adds a
platform-API route that returns one tenant's data — both surfaces the
Plan 31 review found real defects in.
