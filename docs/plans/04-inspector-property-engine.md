# Plan 04 — Inspector / Property Engine

## Objective

Implement the Property Engine described in
`docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md` section 4: given a
selected node, turn its component's `propertySchema` into a data-driven
description of an inspector UI, and turn inspector edits back into
`UpdateProps`/`UpdateStyles` commands. This plan produces the data
layer only — no actual React inspector UI/widgets (that belongs to the
eventual editor app, not the engine).

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, don't modify):
- `builder/registry/types.ts` — `PropertyField` (`key`, `label`, `type`,
  `options?`, `defaultValue?`) and `PropertySchema` are already defined.
  This plan does not add new field types unless a real gap shows up —
  if it does, note it in your final report rather than editing
  `registry/types.ts` yourself (that file belongs to core).
- `builder/history/types.ts` — `Command`, specifically
  `UpdatePropsPayload { pageId, nodeId, props }` and
  `UpdateStylesPayload { pageId, nodeId, styles }`. Your output commands
  must match these shapes exactly.
- `builder/document/types.ts` — `BuilderNode`.

## Deliverables

Directory: `builder/inspector/`.

### `builder/inspector/types.ts`

```ts
export interface InspectorField {
  readonly key: string;
  readonly label: string;
  readonly type: PropertyField["type"];
  readonly value: unknown;          // current value, from the node's props
  readonly options?: PropertyField["options"];
}

export interface InspectorModel {
  readonly nodeId: NodeId;
  readonly componentType: string;
  readonly fields: readonly InspectorField[];
}
```

### `builder/inspector/build.ts`

```ts
export function buildInspectorModel(
  node: BuilderNode,
  registry: ComponentRegistry,
): InspectorModel | undefined
```
Look up `registry.get(node.type)`; if missing, return `undefined` (don't
throw — a node can transiently reference an unregistered type while a
document loads, and the inspector should just show nothing rather than
crash the editor). Otherwise map `definition.propertySchema` to
`InspectorField[]`, pulling each field's current `value` from
`node.props[field.key]`, falling back to `field.defaultValue` if the key
is absent from `props`.

### `builder/inspector/edit.ts`

```ts
export function createUpdatePropsCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command
```
Returns a single `{ type: "UpdateProps", payload: { pageId, nodeId:
node.id, props: { [key]: value } } }` — one field edit, one command,
matching the shallow-merge semantics already implemented in
`builder/history/commands.ts`. Do not batch multiple field edits into
one command; that's a UX decision for the editor layer (e.g. it might
choose to batch keystrokes before calling this), not this plan's job.

Also provide the styles equivalent:
```ts
export function createUpdateStylesCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command
```
producing an `UpdateStyles` command. (If Plan 03's `NodeStyleRules`
shape has landed by the time you write this, note it in your report,
but don't take a hard dependency on `builder/styles/*` — this function
should stay agnostic to the internal shape of the styles bag; `key`
here means "the key inside `payload.styles`", nothing more.)

### `builder/inspector/validate.ts`

```ts
export function validateFieldValue(field: PropertyField, value: unknown): string | undefined
```
Cheap type-shape validation matching `PropertyField.type` (e.g.
`"number"` → `typeof value === "number"`, `"select"` → value must be one
of `field.options.map(o => o.value)` if options are present). Return an
error message string, or `undefined` if valid. This is meant to run
before `createUpdatePropsCommand` is called, so the engine never
receives an obviously-wrong value — it is not a replacement for
component-level validation.

### `builder/inspector/index.ts`

Barrel: `export * from "./types"; export * from "./build"; export *
from "./edit"; export * from "./validate";`

## Non-goals

- No React components, no actual form widgets/inputs — this is data and
  command-construction only.
- Don't modify `builder/registry/*` or `builder/history/*`.
- Don't add a schema-validation library dependency (zod, yup, etc.) for
  `validate.ts` — the checks needed are simple typeof/enum checks; zod
  is already a repo dependency if you decide it's genuinely worth
  reaching for, but justify that choice in your final report rather
  than defaulting to it.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: using a small inline `ComponentDefinition` with a
  `propertySchema` of two fields (one `"string"`, one `"select"` with
  two options), build a `BuilderNode` with props for one of those two
  fields set and the other omitted, call `buildInspectorModel`, and
  confirm the omitted field's `value` falls back to its
  `defaultValue` while the present field's `value` reflects the node's
  actual prop.
- Smoke check: `createUpdatePropsCommand` produces a command that, when
  run through `createCommandEngine().apply(...)` (from
  `builder/history/commands.ts`), successfully updates exactly the
  targeted prop and leaves sibling props untouched.
- `validateFieldValue` rejects an out-of-range `"select"` value and
  accepts an in-range one.
