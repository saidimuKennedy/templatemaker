# Plan 03 — Style Engine

## Objective

Implement the Style Engine described in `docs/02-core-architecture.md`
and `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md` section 4: design
tokens, spacing/color/typography values, and responsive rules, stored
separately from rendering (`BuilderNode.styles`) and resolved into
concrete CSS at render time — without the Renderer ever needing to know
about tokens itself.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, don't modify):
- `builder/document/types.ts` — `NodeStyles = Record<string, unknown>`.
  The document model deliberately leaves the internal shape of a node's
  `styles` bag up to you; this plan is what defines that shape for
  real.
- `builder/renderer/renderer.tsx` / `types.ts` — note carefully: the
  `ComponentRenderer` type (`builder/registry/types.ts`) that every
  component implements takes `{ id, props, children }` — **not**
  `styles`. That's an intentional gap the roadmap left for this plan to
  close. Do not modify `ComponentRenderer`'s signature (that's a frozen
  contract other plans build against). Instead, resolve styles into
  something that travels through **props**, or wrap rendering with a
  higher-order step. See Deliverables.

## Deliverables

Directory: `builder/styles/`.

### `builder/styles/types.ts`

Define the shapes this subsystem owns:
```ts
export type Breakpoint = "base" | "sm" | "md" | "lg";

export interface DesignTokens {
  readonly colors: Record<string, string>;
  readonly spacing: Record<string, string>;   // e.g. { sm: "8px", md: "16px", lg: "24px" }
  readonly typography: Record<string, { fontSize: string; fontWeight?: string | number; lineHeight?: string }>;
}

/** The shape NodeStyles actually takes in this engine: per-breakpoint style declarations. */
export interface ResolvedStyleDeclaration {
  readonly [cssProperty: string]: string | number;
}

export type NodeStyleRules = Partial<Record<Breakpoint, ResolvedStyleDeclaration>>;
```
Document clearly (a short comment is fine here, since it's non-obvious)
that a `BuilderNode.styles` value, when you're inside this subsystem,
should be treated as `NodeStyleRules` even though the document model
types it as the wider `NodeStyles = Record<string, unknown>` — that
widening is intentional so `document/` doesn't depend on `styles/`.

### `builder/styles/tokens.ts`

- A `defaultTokens: DesignTokens` with a small sane starter palette —
  don't over-build a theming system, just enough tokens for spacing
  (`xs/sm/md/lg/xl`), a handful of named colors, and 2–3 typography
  scale steps.
- `resolveToken(tokens: DesignTokens, category: keyof DesignTokens, key: string): string | undefined`
  helper.

### `builder/styles/resolve.ts`

The core function:
```ts
export function resolveNodeStyle(
  styles: NodeStyleRules,
  breakpoint: Breakpoint,
  tokens: DesignTokens = defaultTokens,
): React.CSSProperties
```
Mobile-first cascade (ADR-004 — mobile-first webviews matters here):
resolve `"base"` first, then merge in rules for every breakpoint up to
and including the requested one, in a fixed order (`base` <
`sm` < `md` < `lg`), later ones overriding earlier ones. Values that
match a token key it should already have been baked into concrete CSS
values by the time they're in `NodeStyleRules` — token resolution
happens when *setting* styles (see below), not when reading them, to
keep this function fast and pure.

### `builder/styles/apply.ts`

Since `ComponentRenderer` can't take a `styles` prop directly, provide
the integration point as an explicit, composable helper rather than
silently smuggling styles into `props`:

```ts
export interface StyledProps {
  readonly style: React.CSSProperties;
}

/** Wraps a ComponentDefinition's renderer so it also receives a resolved `style` prop under `props.style`. */
export function withResolvedStyles(
  definition: ComponentDefinition,
  breakpoint: Breakpoint,
  tokens?: DesignTokens,
): ComponentDefinition
```

`withResolvedStyles` returns a **new** `ComponentDefinition` whose
`renderer` is a small wrapper component: it takes the same `{ id, props,
children }`, resolves the node's styles are not actually available at
this layer (the node itself isn't passed to `ComponentRenderer` — only
`props`). **Read this carefully and resolve the design gap before
coding**: the cleanest fix that doesn't touch the frozen
`ComponentRenderer` contract is to do style resolution in the Renderer's
tree walk (`builder/renderer/renderer.tsx`), *before* calling the
component, and merge the resolved `style` object into the `props` bag
passed to `<Component props={{ ...node.props, style: resolvedStyle }}>`.

Since you own this plan's directory only and `renderer.tsx` is owned by
core (already done, not listed as yours to edit), do not edit it
directly. Instead:
- Export a pure function `mergeStyleIntoProps(node: BuilderNode,
  breakpoint: Breakpoint, tokens?: DesignTokens): NodeProps` from
  `builder/styles/apply.ts` that returns `{ ...node.props, style:
  resolveNodeStyle(node.styles as NodeStyleRules, breakpoint, tokens) }`.
- Provide a **decorator around `Renderer`**, not a modification of it:
  `export function createStyledRenderer(renderer: Renderer, breakpoint: Breakpoint, tokens?: DesignTokens): Renderer`
  that wraps `renderPage`/`renderDocument`. If wrapping cleanly requires
  re-walking the tree yourself (since `Renderer` doesn't expose a
  per-node hook), it's acceptable for `createStyledRenderer` to
  re-implement the walk using `RenderContext` + `ComponentRegistry`
  directly (same pattern as `renderer.tsx`), producing node props via
  `mergeStyleIntoProps` before delegating to
  `context.registry.get(node.type).renderer`. Note in your final report
  that this duplicates a small amount of tree-walk logic from
  `renderer.tsx`, and suggest (don't implement) that a future pass could
  add an optional `resolveProps` hook to `RenderContext` to avoid the
  duplication — that's a cross-cutting contract change outside this
  plan's scope.

### `builder/styles/index.ts`

Barrel: `export * from "./types"; export * from "./tokens"; export *
from "./resolve"; export * from "./apply";`

## Non-goals

- No visual design-token editor UI — that's an application/canvas
  concern, not this plan.
- Don't modify `builder/renderer/renderer.tsx`, `builder/registry/*`, or
  `ComponentRenderer`'s signature.
- Don't add a CSS-in-JS library dependency (styled-components, emotion,
  etc.) — resolve to plain `React.CSSProperties` objects; Tailwind (used
  elsewhere in the repo) is a v1 non-goal for the engine itself since
  the engine must stay renderer/host agnostic.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: construct a `NodeStyleRules` with a `base` color and an
  `md` breakpoint override, call `resolveNodeStyle` at `"base"` and at
  `"md"`, confirm the `md` result includes the base properties plus the
  override, and the `base`-only result does not include the override.
- Smoke check: build a tiny document + registry (reuse Plan 02's
  components if available, otherwise a single trivial inline
  `ComponentDefinition`), wrap `createRenderer()` with
  `createStyledRenderer`, and confirm the resulting element tree's root
  node's `props.style` reflects the resolved styles.
