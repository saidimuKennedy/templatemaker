# Plan 02 — Built-in Components

## Objective

Implement a first, generic (non-business) set of `ComponentDefinition`s
so the registry and renderer have real components to register and
render, per `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md` section 9
("Component Categories") and `docs/05-component-and-plugin-specification.md`.

## Context

Read `builder/CONTRIBUTING.md` first. Rule 5 matters most here: *the
engine never imports business-specific components* — everything you
write in this plan is generic (Layout/Content/Interaction), not Business
(Product Card, Pricing, Event Card, etc. — those belong in a future
plugin package, not here).

Already implemented (read, don't modify):
- `builder/registry/types.ts` — `ComponentDefinition` is the contract
  you're implementing against: `type`, `category`, `icon`,
  `renderer`, `defaultProps`, `propertySchema`, `constraints`. Note
  `ComponentRenderer` is `ComponentType<{ id: string; props: NodeProps;
  children?: ReactNode }>` — **no `styles` prop**. Styling is Plan 03's
  concern (Style Engine); for now just render structurally correct
  HTML/React and ignore styling entirely. Don't invent a styles prop
  that isn't in the contract.
- `builder/registry/registry.ts` — `createComponentRegistry()`, you'll
  call `.register()` with each definition you build, but registration
  itself happens in an app/integration layer, not inside this plan (see
  Deliverables below — you export definitions and a helper to register
  them all, you don't need a running app).
- `builder/renderer/renderer.tsx` — confirms how a `ComponentRenderer`
  gets invoked: `<Component id={node.id} props={node.props}>{children}</Component>`.

## Deliverables

Directory: `builder/components/`. One file per component, plus an
index.

Build these components, matching the "Layout" and "Content" categories
from `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md` section 9 (skip
Interaction/Navigation/Business for this plan — keep scope tight):

- `Page` — category `Layout`. Root-level wrapper. `allowedParents:
  undefined` (can be a page root), no children constraint (accepts
  anything). Renders a `<div data-node-type="Page" data-node-id={id}>`.
- `Section` — category `Layout`. `allowedParents` should NOT be
  restricted to just `Page` — sections can nest — so leave
  `allowedParents` undefined too, but do give it sensible default props
  (e.g. `{ padding: "md" }` — note: no `styles` system yet, so
  `defaultProps` here are just plain data the component reads directly,
  not resolved design tokens).
- `Container` — category `Layout`. Generic block wrapper, any children.
- `Stack` — category `Layout`. Prop `direction: "row" | "column"`
  (default `"column"`) rendered as a flex container via inline style or
  a data attribute + a small CSS class — your call, but keep it
  self-contained (no new CSS file dependency; inline `style` on the
  wrapping `<div>` is simplest and matches "no styles system yet").
- `Heading` — category `Content`. Prop `text: string`, `level: 1|2|3|4|5|6`
  (default 2). Renders `<h{level}>{text}</h{level}>` (you'll need a
  small level→tag lookup since JSX can't interpolate tag names
  directly).
- `Text` — category `Content`. Prop `text: string`. Renders `<p>{text}</p>`.
  Leaf node: `allowedChildren: []`.
- `Image` — category `Content`. Props `src: string`, `alt: string`
  (default `""`). Renders `<img src={props.src} alt={props.alt} />`.
  Leaf node: `allowedChildren: []`.
- `Button` — category `Interaction` (single exception to the
  Layout/Content-only scope above, since it's trivial and useful for
  Plan 06's canvas smoke-testing later). Props `label: string` (default
  `"Button"`), `href?: string`. Renders a `<button>` or, if `href` is
  set, an `<a role="button">`. Leaf node.

For every component, fill in `propertySchema` with real `PropertyField`
entries matching the props above (types: `"string"`, `"number"`,
`"select"` for `level`/`direction`, etc.) — this is what Plan 04's
Inspector will consume, so it needs to be accurate, not a stub.

`builder/components/index.ts`:
```ts
export * from "./page";
export * from "./section";
export * from "./container";
export * from "./stack";
export * from "./heading";
export * from "./text";
export * from "./image";
export * from "./button";

import type { ComponentRegistry } from "../registry/types";
// import each definition
export function registerBuiltInComponents(registry: ComponentRegistry): void {
  registry.register(PageComponent);
  // ...one per component
}
```

## Non-goals

- No styling system — don't add className/design-token logic; that's
  Plan 03.
- No Business or Navigation category components (Product Card, Navbar,
  etc.) — out of scope for this plan.
- Don't modify `builder/registry/*` or `builder/renderer/*`.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- A smoke check: build a `createComponentRegistry()`, call
  `registerBuiltInComponents(registry)`, assemble a tiny `BuilderProject`
  with a `Page` root containing a `Section` containing a `Heading` and a
  `Text`, and confirm `createRenderer().renderPage(page, { registry,
  target: "editor-preview" })` returns without throwing (React element
  tree constructed successfully — you don't need to actually mount it
  with a DOM renderer, just confirm no "Unknown component type" errors
  and the element tree shape looks right).
- Every component's `propertySchema` entries correspond 1:1 to keys in
  its `defaultProps`.
