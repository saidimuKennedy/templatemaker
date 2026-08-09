# Plan 29 — Runtime Foundation: Bindings, Actions, and the Client Boundary

## Objective

Land the two abstractions that stop the renderer being redesigned every
time a non-static feature arrives — **Binding** and **Action** — plus the
scoped client runtime that executes them.

No forms. No data sources. No tables. This plan ends when a Button on a
published page can run a declared action, and a portfolio with no actions
still ships zero JavaScript.

That second half is not a nice-to-have. It is the acceptance criterion
that keeps the static site builder and the application builder on one
engine.

## Context every agent must read first

- **[ADR-012](../decisions/ADR-012-application-layer-bindings-and-actions.md)**
  — binding on this plan. The four contracts are settled.
- **[Plan 28](./28-application-layer-overview.md)** — where this sits.
- `builder/CONTRIBUTING.md` — rules 1, 3, and 7 all bite here. See
  "Rule interpretations" below; the naive reading of rule 1 makes this
  plan impossible.
- `AGENTS.md` — **this is not the Next.js you know.** Read
  `node_modules/next/dist/docs/` before writing client/server boundary
  code. Do not assume App Router behaviour from memory.
- **ADR-008** — every addition here is optional with a documented
  fallback. `schemaVersion` does not bump.

## Rule interpretations (read before you think this plan violates CONTRIBUTING)

**Rule 1, "no state outside the document."** This governs the application
*definition*, not runtime *values*. Which variables exist is document
data. What a user has typed into an input right now is not: it does not
serialize, does not validate, does not enter undo history. ADR-012 §4.

**Rule 7, "renderers never modify documents."** Binding resolution is
read-only and happens *before* the renderer runs. Actions execute in a
client runtime that talks to the API layer — never to the document. A
published page's runtime has no command API and no write access to the
document. Nothing in this plan gives it one.

## Already implemented — do not rebuild

- **`createStyledRenderer` / `mergeStyleIntoProps`** (`builder/styles/apply.tsx`)
  — the decorator pattern this plan must copy. Styles reach components by
  being merged into the props bag *before* render, because
  `ComponentRenderer`'s `{ id, props, children }` signature is frozen.
  **Bindings resolve the same way.** Do not add a fifth argument to
  `ComponentRenderer`, and do not add a binding parameter to
  `RenderContext` consumers that don't need one.
- **`mergePageLinksIntoProps`** (`builder/pages/resolve-links.ts`) — a
  second existing example of prop transformation between document and
  renderer. Binding resolution composes alongside it, in
  `renderer.tsx`'s `renderNode`.
- **`buildResponsiveStylesheet`** (`builder/styles/responsive.ts`) — has
  the value sanitiser. Any user-authored string that reaches output goes
  through sanitisation; do not write a second one.
- **The command API and history** (`builder/history/`) — all *editing* of
  events and bindings goes through new commands. Never mutate a node.

## Stages

**Stop for review after each stage.** Stage 1 is contract-only and should
be reviewed before any runtime code exists — a wrong `ActionStep` shape
is expensive to unwind once four plans depend on it.

---

## Stage 1 — Contracts only (review before Stage 2)

No behaviour. Types, validation, tests.

### 1a. `builder/bindings/types.ts`

```ts
/** A prop value resolved at render time from a scope, not authored literally. */
export interface Binding {
  readonly $bind: string;
  readonly fallback?: unknown;
}

export function isBinding(value: unknown): value is Binding;
```

`$bind` is a **dotted path against a named scope**, e.g.
`form.values.email`, `route.params.id`, `user.name`, `data.customers.rows`.

Hard constraints, from ADR-012:
- No expression language. No `eval`. No function calls, no operators.
- Unknown scope or unresolvable path → `fallback`, else `undefined`.
  Resolution **never throws**; a broken binding must degrade, not blank
  the page.
- Path segments are `[A-Za-z0-9_]` plus `.` separators. Reject anything
  else at validation time, including `__proto__`, `constructor`, and
  `prototype` — prototype pollution via an authored path is the obvious
  attack and the resolver must be immune by construction, not by
  blacklist alone (use `Object.hasOwn`, never bare property access).

### 1b. `builder/actions/types.ts`

```ts
export type EventName = "onClick" | "onSubmit" | "onChange";

export type ActionStep =
  | { readonly type: "navigate"; readonly to: string | Binding; readonly newTab?: boolean }
  | { readonly type: "setVariable"; readonly name: string; readonly value: unknown | Binding }
  | { readonly type: "notify"; readonly level: "success" | "error" | "info"; readonly message: string | Binding }
  | { readonly type: "openModal"; readonly nodeId: NodeId }
  | { readonly type: "closeModal"; readonly nodeId: NodeId };
```

**Only these five ship in Stage 1.** `submitForm`, `createRecord`,
`updateRecord`, `deleteRecord`, and `refetch` are named in ADR-012 and are
added by Plans 31–32, when there is a backend for them to hit. Declaring
them now with no implementation invites half-wired call sites.

Every step may carry an optional `when?: Condition` (Stage 1c). Steps run
in declared order; a failed step halts the sequence and surfaces an error.

### 1c. `Condition`

The closed operator set from Plan 28's brief, no more:

```ts
export interface Comparison {
  readonly left: unknown | Binding;
  readonly op: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "empty" | "notEmpty";
  readonly right?: unknown | Binding;
}
export type Condition =
  | Comparison
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition };
```

### 1d. Document contract addition

In `builder/document/types.ts`, one optional field on `BuilderNode`:

```ts
readonly events?: Readonly<Partial<Record<EventName, readonly ActionStep[]>>>;
```

`Partial` is load-bearing: without it every node wiring `onClick` would also
be required to declare `onSubmit` and `onChange`.

Absent = today's behaviour exactly. Every existing document stays valid.
No `schemaVersion` bump (ADR-008 rule 2).

Bindings need **no** contract change — `NodeProps` is already
`Record<string, unknown>`. State this in the code comment so the next
reader doesn't "fix" it by adding a typed field.

### 1e. Registry contract addition

In `builder/registry/types.ts`:

```ts
/** Whether this component needs the client runtime. Default "server". */
readonly runtime?: "server" | "client";
```

### 1f. Validation

Extend `builder/document/validate.ts`:
- `events` keys are known `EventName`s.
- Each step matches its variant's shape; unknown `type` is an error.
- `openModal`/`closeModal` reference a node id that exists in the document.
- Binding paths are syntactically valid (1a) wherever they appear.

**Stage 1 exit:** types, validators, and unit tests land. Nothing renders
differently. `npm test` green.

---

## Stage 2 — Binding resolution (pure, server-safe)

`builder/bindings/resolve.ts`:

```ts
export interface BindingScope {
  readonly data?: Readonly<Record<string, unknown>>;
  readonly route?: { readonly params?: Readonly<Record<string, string>> };
  readonly form?: Readonly<Record<string, unknown>>;
  readonly user?: Readonly<Record<string, unknown>>;
  readonly vars?: Readonly<Record<string, unknown>>;
}

export function resolveBinding(binding: Binding, scope: BindingScope): unknown;
export function resolveProps(props: NodeProps, scope: BindingScope): NodeProps;
export function evaluateCondition(condition: Condition, scope: BindingScope): boolean;
```

Wire `resolveProps` into `renderNode` (`builder/renderer/renderer.tsx`)
alongside the existing `mergePageLinksIntoProps` call. An empty scope
resolves every binding to its fallback, which is what the editor canvas
and any static page get for free.

Resolution is deep (bindings nested in arrays/objects) and **must not**
mutate the input props.

**Stage 2 exit:** a Text node whose `content` prop is
`{ $bind: "vars.greeting", fallback: "Hello" }` renders `Hello` with an
empty scope and the variable's value with a populated one. Still zero
client JS.

---

## Stage 3 — The client runtime boundary

The load-bearing stage. Get this wrong and every published portfolio
starts shipping a bundle.

### 3a. Detection

`builder/runtime/needs-runtime.ts` — a pure predicate over a page tree:

```ts
export function pageNeedsRuntime(page: BuilderPage, registry: ComponentRegistry): boolean;
```

True if any node has `events`, any prop contains a `Binding`, or any
node's definition declares `runtime: "client"`. Otherwise false.

### 3b. Mount

`builder/runtime/BuilderRuntime.tsx` — a `"use client"` provider holding
runtime values (`vars`, form state later, data later) and exposing an
action dispatcher. **The first `"use client"` file in `builder/`.**

In `lib/builder/content.tsx`, wrap the rendered tree in `<BuilderRuntime>`
**only when `pageNeedsRuntime` is true.** When false the output must be
byte-identical to today's.

### 3c. Action interpretation

`builder/actions/interpret.ts` — walks an `ActionStep[]`, evaluates each
`when`, resolves `Binding` arguments against the live scope, and executes
the five Stage-1 step types. Sequential; halts on error; surfaces failures
through `notify`.

`navigate` must not accept a `javascript:` or `data:` URL. Reuse the
existing link sanitisation path rather than writing a second check.

### 3d. Attaching handlers

**Handlers are built inside the client component, never passed into it.**
Only serializable values cross the server/client boundary in RSC, so the
server renderer forwards the declarative `events` bag as data and the
client component turns it into handlers via `useNodeEventHandlers`.

Mechanism: `ComponentDefinition` gains an optional `clientRenderer`
alongside `renderer`. `selectRenderer` (`builder/renderer/select-renderer.ts`,
shared by `renderer.tsx` and `styles/apply.tsx`) picks the client variant
only when the node actually declares `events` **and** the runtime is
enabled, and merges `events` into the props bag at that point. A node with
events whose component has no `clientRenderer` degrades to static markup
rather than blanking the page.

`Button` is the first component to opt in: `button.tsx` (server),
`button-client.tsx` (`"use client"`), and `button-view.tsx` (shared markup,
no directive). An events-free Button still renders entirely on the server.

**Do not** attach handlers in the renderer via a render prop or by merging
functions into props. Both fail at runtime with *"Functions cannot be passed
directly to Client Components"* — the tests cannot catch it, only a real
page render can. `select-renderer.test.ts` guards the props bag against
functions as the closest available proxy.

**Stage 3 exit, both halves required:**
1. A published Button with `events.onClick = [{ type: "notify", level: "success", message: "It works" }]` shows a toast.
2. An existing seeded portfolio, published, transfers **no runtime JS** —
   verified by inspecting the network panel or built output, not by
   reading the code and assuming.

---

## Stage 4 — Editing surface

Without this the feature exists and no user can reach it — the exact
failure Plan 24 was written to fix.

- New commands in `builder/history/` — `SetNodeEvents`, `SetPropBinding`,
  `ClearPropBinding` — undoable like every other edit. **No direct node
  mutation.**
- An **Interactions** panel in the Inspector: pick an event, add steps,
  configure each step's arguments, reorder, delete.
- Per-field binding toggle in the Inspector: any property field can switch
  between a literal value and a `$bind` path, with the bound state
  visibly distinct from an authored one.

A raw JSON textarea does not satisfy this stage.

**Stage 4 exit:** a user builds the Stage 3 button in the editor UI, with
undo/redo working, without touching JSON.

---

## Test requirements

Colocated `*.test.ts` per `builder/` convention:

- **Resolver:** unresolvable path → fallback; missing fallback →
  `undefined`; deep/nested bindings; **prototype-pollution paths rejected**;
  input props never mutated.
- **Conditions:** every operator; `all`/`any`/`not` nesting; bound operands.
- **Validation:** malformed `events` rejected; unknown step type rejected;
  dangling modal node id rejected.
- **Detection:** `pageNeedsRuntime` false for every existing seed template
  in `lib/builder/starter-templates.ts` — this is the zero-JS guarantee
  expressed as a test, and it should fail loudly if someone later adds a
  binding to a starter template.
- **Interpreter:** sequential execution; halt on error; `when` gating;
  `javascript:` navigation blocked.

## Out of scope for Plan 29

Forms and inputs (32) · data sources and fetching (33) · the
`createRecord`/`updateRecord`/`deleteRecord`/`submitForm`/`refetch` steps
(31–32) · any API route (31) · permissions (35) · an expression language
(deferred indefinitely, ADR-012).

If a stage seems to need one of these, the boundary is in the wrong place
— raise it rather than pulling the dependency forward.
