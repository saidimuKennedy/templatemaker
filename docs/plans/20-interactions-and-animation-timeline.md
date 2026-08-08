# Plan 20 — Interactions & Animation Timeline

## Do this last. It is the largest and most invasive plan in the set.

## Objective

A Webflow-style keyframe timeline: multiple keyframes per animation,
per-property tracks, and triggers that play them.

**This reverses a documented v1 exclusion, in its strongest form.**
`docs/01-vision-and-product-principles.md` lists "Advanced animation
timelines" under *Out of Scope (v1)*; architecture spec §10 lists
"Animation timeline". The owner explicitly chose the full timeline over
a bounded trigger→effect system — see
`docs/decisions/ADR-007-v2-scope-expansion.md` (Plan 21).

Because this is the heaviest option, **land it in the three stages
below and stop for review between each**. Do not attempt all three in
one pass.

## Context

Read `builder/CONTRIBUTING.md` first. Two rules bite hard here:

- **"The document model is the single source of truth."** Animation
  definitions are document data, not component state. They serialize,
  they validate, they undo.
- **"Renderers never modify documents."** Playback must not write back
  into the document. Timeline *editing* goes through commands; timeline
  *playback* is read-only.

Already implemented (read, understand before extending):
- `builder/document/types.ts` — `BuilderNode` is `{ id, type, props,
  styles, children }`. Adding animations means **extending the node
  contract**, which is the most consequential change in this plan.
- `builder/styles/types.ts` — `NodeStyleRules` is per-breakpoint CSS.
  Animations are a sibling concept, not a breakpoint.
- `builder/styles/responsive.ts` — `buildResponsiveStylesheet` already
  emits a real `<style>` sheet keyed on `data-node-id`, with value
  sanitisation. Animation CSS should be emitted the same way and
  **must reuse the same sanitiser** — timeline values are user input
  and end up in a stylesheet.
- `builder/history/types.ts` — the `Command` union. New animation edits
  need new command types.

## Stage 1 — Document model + contracts (review before Stage 2)

Extend the node contract in `builder/document/types.ts`:

```ts
export type EasingName = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";

export interface Keyframe {
  readonly offset: number;                 // 0..1
  readonly properties: Readonly<Record<string, string | number>>;
}

export interface Animation {
  readonly id: string;
  readonly name: string;
  readonly trigger: "load" | "hover" | "click" | "scroll-into-view";
  readonly durationMs: number;
  readonly delayMs: number;
  readonly easing: EasingName;
  readonly loop: boolean;
  readonly keyframes: readonly Keyframe[];  // sorted by offset
}

export interface BuilderNode {
  // ...existing fields
  readonly animations?: readonly Animation[];
}
```

`animations` must be **optional** so every existing document stays
valid. Bump `BuilderDocumentMeta.schemaVersion` to `2` for newly
created documents, but `validateDocumentStructure` must keep accepting
`schemaVersion: 1` documents unchanged — there is real data in the
database.

Add validation: offsets within 0..1 and sorted, `durationMs > 0`,
non-empty keyframes, unique animation ids within a node.

Add commands to `builder/history/types.ts`:
`AddAnimation`, `RemoveAnimation`, `UpdateAnimation`, `UpsertKeyframe`,
`RemoveKeyframe` — and implement `apply` + `invert` for each in
`builder/history/commands.ts`. Every one must be invertible; that's what
makes timeline editing undoable.

**Stop and report after Stage 1.** Types + validation + commands +
tests, no UI, no playback.

## Stage 2 — Playback (review before Stage 3)

`builder/animations/css.ts`: compile each node's `animations` into real
CSS `@keyframes` + `animation` declarations, emitted into the published
stylesheet alongside `buildResponsiveStylesheet`. Reuse its sanitiser
and its `[data-node-id="…"]` selector convention.

- `trigger: "load"` → applied directly.
- `trigger: "hover"` → scope under `:hover`.
- `trigger: "click"` / `"scroll-into-view"` → CSS alone can't do these.
  Emit a tiny, self-contained inline script that toggles a class
  (`IntersectionObserver` for scroll, a click listener for click).
  Keep it dependency-free and under ~30 lines; it ships to every
  published page.

Editor canvas: animations must be **previewable but not disruptive**.
Add a "Preview animations" toggle in the canvas toolbar, default
**off** — a canvas where things constantly move is unusable for
editing. When off, render the element in its final (last-keyframe)
state.

Respect `prefers-reduced-motion`: wrap emitted animation CSS so it is
disabled under `@media (prefers-reduced-motion: reduce)`. This is an
accessibility requirement, not an enhancement.

**Stop and report after Stage 2.**

## Stage 3 — Timeline UI

`components/editor/AnimationPanel.tsx` — a third Inspector tab
("Interactions") alongside Content and Design:
- List of animations on the selected node; add/remove.
- Per-animation: name, trigger, duration, delay, easing, loop.
- A horizontal timeline strip: keyframes as draggable markers along
  0..1, click to select, drag to change offset (→ `UpsertKeyframe`).
- With a keyframe selected, edit its properties reusing the existing
  `STYLE_FIELDS` vocabulary from `builder/styles/fields.ts` — do not
  invent a second, divergent list of animatable properties.
- A scrub handle that previews the interpolated state at a given
  offset (read-only; scrubbing must not emit commands).

Every edit goes through `EditorSession.execute`. No direct mutation.

## Non-goals

- No scroll-*scrubbed* animation (progress tied to scroll position) —
  only scroll-*triggered*. Say so in the UI.
- No timeline for page transitions or multi-element choreography;
  animations belong to a single node.
- No spring/physics easing, no custom cubic-bezier editor (the fixed
  `EasingName` set only).
- No animation of layout-affecting properties beyond transform/opacity
  unless you verify performance; document what you allow.

## Acceptance criteria

Per stage, and all of `npx tsc --noEmit`, `npm run build`,
`npm run lint`, `npm test` clean at each stage.

- **Stage 1:** existing `schemaVersion: 1` documents in the database
  still load, validate, and render unchanged — verify against a real
  row, not a fixture. Every new command round-trips through
  apply→invert→apply and returns the original document.
- **Stage 2:** a published page with a hover animation shows real
  `@keyframes` in its stylesheet; the CSS-injection sanitiser test from
  Plan 16 still passes and now also covers animation values; animations
  are suppressed under `prefers-reduced-motion: reduce`.
- **Stage 3:** adding a keyframe, dragging it, and undoing all of it
  returns the document to its exact prior state.
- Confirm published output has no runtime dependency beyond the small
  inline trigger script — no animation library added.
