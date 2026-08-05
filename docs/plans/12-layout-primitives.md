# Plan 12 — Layout Primitives (Grid, Stack alignment, Navbar, Footer)

## Objective

Close the structural gap behind layouts like a navbar with logo-left/
links-right, or a side-by-side two-column content block: today
`builder/components/*` only has `Stack` with a bare
`display:flex; flexDirection; gap:8px` — no `justify-content`/
`align-items` control, no CSS grid, and no `Navigation`-category
components at all, even though `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md`
section 9 lists `Grid`, `Navbar`, and `Footer` as intended v1 components.
This plan builds the minimum set needed to actually reproduce that class
of layout, not the full section-9 list (no `Tabs`/`Breadcrumb` — not
needed for this problem, explicitly deferred).

Can run in parallel with Plan 11 — disjoint files (`builder/components/*`
vs. `components/editor/*`).

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, follow their exact conventions — plain
function component, small inline SVG icon, `propertySchema` matching
`defaultProps` keys 1:1, `data-node-id={id}` on the root element):
- `builder/components/stack.tsx` — you are **modifying this file**,
  not creating a new one. Current props: `direction` only.
- `builder/components/section.tsx`, `container.tsx` — closest existing
  analogues for a plain wrapper component.
- `builder/registry/types.ts` — `ComponentDefinition`, `NodeConstraints`,
  `PropertyField` (note: `"select"` type fields, used heavily below).
- If Plan 11 has landed by the time you start: every built-in component
  applies `props.style` to its root element now (a fix made in that
  plan) — new components you write in this plan must do the same from
  the start, don't reintroduce the gap Plan 11 just closed. If Plan 11
  hasn't landed yet, still write your new components (`Grid`, `Navbar`,
  `Footer`) applying `props.style` from day one — match
  `builder/plugins/portfolio/*`'s existing pattern
  (`const style = props.style as CSSProperties | undefined`, spread
  onto the root element), since that's already correct there.

## Deliverables

### `builder/components/stack.tsx` (modify)

Add two new props, both optional with sensible defaults matching
today's behavior (no visual change for existing documents that don't
set them):
- `justify: "start" | "center" | "end" | "between" | "around"` (default
  `"start"`) → CSS `justifyContent` (`"between"` → `"space-between"`,
  `"around"` → `"space-around"`, others pass through as-is).
- `align: "start" | "center" | "end" | "stretch"` (default `"stretch"`)
  → CSS `alignItems`.

Add both as `"select"` `PropertyField`s to `propertySchema` (matching
the existing `direction` field's pattern) and to `defaultProps`. Existing
seed documents (`lib/builder/seed.ts`) that construct `Stack` nodes
without these props must keep working unchanged — verify this
specifically (see Acceptance Criteria).

### `builder/components/grid.tsx` (new)

Component `type: "Grid"`, category `"Layout"`.
Props: `columns: number` (default `2`), `gap: "sm" | "md" | "lg"`
(default `"md"`, reuse the same token values `Section`'s `PADDING_MAP`
already uses — factor a small shared `SPACING_MAP` if you want, or just
duplicate the three values, your call, but keep it consistent with
`Section`'s existing values: sm=8px, md=16px, lg=32px).
Renders `<div style={{ display: "grid", gridTemplateColumns:
\`repeat(${columns}, 1fr)\`, gap: SPACING_MAP[gap], ...style }}>`.
Unconstrained children (no `allowedChildren` restriction — a grid cell
can hold anything). `propertySchema`: `"number"` for `columns`,
`"select"` for `gap`.

### `builder/components/navbar.tsx` (new)

Component `type: "Navbar"`, category `"Navigation"`.
No content props of its own — it's a layout wrapper, like `Stack`, but
semantically a `<nav>` element with `justifyContent: "space-between"`
and `alignItems: "center"` baked in by default (not user-editable via
props for v1 — keep this simple, it's the one opinionated layout this
plan needs to unblock the reference screenshot's navbar pattern).
`defaultProps: {}`, `propertySchema: []`. Unconstrained children (a
logo `Text`/`Heading` node plus a `Stack` of link `Button`/`Text` nodes,
composed by the user — don't build a specialized "logo slot" / "links
slot" concept, that's over-engineering for what's needed here).

### `builder/components/footer.tsx` (new)

Component `type: "Footer"`, category `"Navigation"`. Renders a plain
`<footer style={style}>{children}</footer>` — structurally identical to
`Container` but with the semantic tag and category. Unconstrained
children.

### `builder/components/index.ts` (extend)

Add `export * from "./grid"; export * from "./navbar"; export * from
"./footer";` and register all three in `registerBuiltInComponents`.

## Non-goals

- No `Tabs`, `Breadcrumb`, or any other section-9 component beyond
  `Grid`/`Navbar`/`Footer` — not needed for the layout pattern that
  motivated this plan, defer them.
- No responsive column-count changes on `Grid` (e.g. "2 columns on
  desktop, 1 on mobile") — that's a breakpoint-aware style concern
  layered on top via the Style Engine later, not a `Grid`-specific prop
  now. A single fixed `columns` value is the v1 scope.
- No "logo slot"/"links slot" structured API on `Navbar` — plain
  children, composed freely, like every other container component.
- Don't modify `builder/registry/*`, `builder/renderer/*`, or anything
  under `components/editor/*` (Plan 11's territory).

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes, `npm run build` succeeds.
- Smoke check: register all built-ins (`registerBuiltInComponents`),
  build a small tree — `Navbar` containing a `Heading` (logo) and a
  `Stack{direction:"row"}` of three `Text` nodes (links) — and confirm
  it renders via `createRenderer()` without throwing, and the rendered
  HTML's `Navbar` root element has `justify-content:space-between` (or
  equivalent) somewhere in its style.
- Smoke check: `Grid{columns:3}` with three `Image` children renders
  with `grid-template-columns: repeat(3, 1fr)` in its style, and
  `Stack{direction:"row", justify:"between", align:"center"}` resolves
  to `justify-content:space-between; align-items:center`.
- Regression check: load (or reconstruct) a document produced by
  `lib/builder/seed.ts`'s `createDefaultDocument` from before this
  plan's `Stack` changes, and confirm it still validates and renders
  identically — the new `justify`/`align` props must not change
  existing documents that predate them (they'll be absent from
  `node.props`, and `buildInspectorModel`/rendering must fall back to
  the same defaults as today's behavior: `justify-content: flex-start`
  as the browser default, `align-items: stretch` as the browser
  default — confirm the *actual rendered CSS*, not just that nothing
  throws, since `Stack`'s current renderer doesn't even set
  `justifyContent`/`alignItems` today, so the "before" state is browser
  defaults, and the fallback values chosen above must reproduce that).
