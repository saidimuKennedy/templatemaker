# Plan 21 — Webflow Editor Alignment (Navigator + Style Panel)

> **WEBFLOW-DEV-REF:** remove or rename this plan before release. Temporary
> reference to an external editor product during development.

## Objective

The editor's shell does not match the mental model of the people who
will use it. Today it is `[Toolbox | Canvas | Inspector]`, where the
only way to select a node is clicking it on canvas, and the only way to
see structure is reading a wall of dashed "Empty Stack / Empty Section /
Empty Stack" boxes the canvas draws *because* there is nowhere else to
see the tree.

Webflow solves this with two sidebars: a **Navigator** on the left (the
document tree as an indented, clickable outline) and a **Style** panel
on the right (CSS grouped into Layout / Spacing / Size / Position /
Typography / Backgrounds / Borders / Effects). The component library is
a popover off a "+" button, not a permanent column.

This plan brings the editor to that shape. It is UI work only — the
document model, registry, renderer, and style resolution are already
correct and must not change.

## Confirmed decisions (do not re-litigate)

- **Styles stay as inline CSS + generated `@media` rules.** They are
  *not* being converted to Tailwind classes. Tailwind generates CSS by
  scanning source files at build time; class names assembled at runtime
  from database JSON are invisible to that scanner, so the rules would
  never be emitted and published pages would render unstyled. The
  current pipeline (`builder/styles/apply.tsx` for base inline styles +
  `builder/styles/responsive.ts` for `@media` overrides keyed on
  `data-node-id`) has no build-time dependency and is the correct design
  for runtime-authored styles. Tailwind would only ever be appropriate
  as a *code-export* target, which is out of scope here.
- **Toolbox becomes a popover**, not a permanent column.
- **The seed fixture is built before the UI** (Stage 1 blocks Stages 2–4).
  Building a Navigator against a tree of ten identically-labelled
  "Stack" nodes is how you ship something that looks right and reads
  wrong.

## Stage 0 — already landed, do NOT redo

Two files are already changed in the working tree. Read them; do not
rewrite them.

1. **`builder/document/types.ts`** — `BuilderNode` gained an optional
   `name?: string`: an author-given Navigator label, purely
   presentational, never rendered into published output. Optional so
   pre-existing documents stay valid and fall back to `type`.
   `cloneNodeWithNewIds` in `builder/canvas/duplicate.ts` spreads
   `...node`, so `name` already survives duplication with no change.

2. **`builder/styles/fields.ts`** — the flat 9-field list was replaced
   with 8 grouped sections. It now exports:
   - `STYLE_GROUPS` — the groups, each with `id`, `label`, `fields`,
     `defaultOpen`
   - `STYLE_FIELDS` — flattened view, for lookups by key
   - `StyleGroup`, `StyleField`, `StyleFieldKind` types
   - `TEXT_ALIGN_OPTIONS`, `PADDING_SIDES`, `MARGIN_SIDES`
   - `expandSpacingShorthand()` — see Stage 3, item 4

   `StyleFieldKind` gained three members beyond the original six:
   `select` (fixed keyword set, carries its own `options`), `number`
   (unitless — opacity, z-index), and `text` (free-form CSS values —
   transforms, shadows, filters, transitions).

## Context every agent must read first

- `builder/CONTRIBUTING.md` — short and non-negotiable.
- `AGENTS.md` at the repo root — **this is not the Next.js you know.**
  Read the relevant guide in `node_modules/next/dist/docs/` before
  writing Next.js code. APIs and conventions differ from training data.

All agents work directly in this same working tree — no worktrees, no
branches. The stages below are split by file so concurrent edits do not
collide. Touch only the files your stage lists; if you find a bug in
another stage's file, report it instead of fixing it.

## File ownership

| Stage | Owns | Blocked by |
|---|---|---|
| 1 | `scripts/seed-dogfood-portfolio.tsx` | — (do first) |
| 2 | `components/editor/Navigator.tsx` (new) | 1 |
| 3 | `components/editor/StyleInspector.tsx` | — (may run parallel with 1) |
| 4 | `components/editor/EditorClient.tsx`, `components/editor/Toolbox.tsx` | 2 |

Stage 3 is independent of the others and can start immediately. Stage 4
must land last because it imports Stage 2's component.

---

## Stage 1 — The fixture page (blocking)

### Why

This document is what Stages 2 and 4 are verified against. It must look
like a real agency site's structure, not a demo.

### Deliverable

Rewrite `scripts/seed-dogfood-portfolio.tsx` to produce a deeper, fully
**named** "Silence Studio" document. The file already builds a partial
version — read it first and keep what is good.

Update the local `node()` helper to take a name. Suggested signature,
use your judgement:

```ts
function node(id, type, name, props = {}, styles = {}, children = [])
```

Every node must have a meaningful `name`, modelled on Webflow's
Navigator conventions — human, role-describing labels rather than type
names. Real examples from the target design:

```
Navbar, Page Content, Section - Intro, Container, Grid,
Intro Display Wrap, Scroll Anchor Link, Divider, Section Title,
Text - Paragraph, Intro Image Container, Team Image, Footer
```

Note the patterns: `"Section - Intro"` (type + role), `"Intro Image
Container"` (role + role), `"Team Image"` (semantic). Repeated siblings
sharing a name is correct and expected.

### The page, top to bottom

1. **Navbar** — "Silence Studio®" wordmark left; right a Grid of link
   columns: Work/About/Contact, then Twitter/Instagram, then
   "Stolkhom, Sweden" as plain text.
2. **Intro** — enormous "Silence" display heading (~64px base, ~140px at
   `lg`), with a right-aligned "Scroll ↓" hint.
3. **Welcome row** — left label "● Welcome", right a ~20px paragraph.
4. **Two-up portrait image grid** (the "Team Image" nodes).
5. **Work row** — left label "● Work", right a philosophy paragraph.
6. **Work list**, 7 bordered rows of name / discipline / year:
   Vitality/Development/2025, Vibe Art/Web design/2025,
   Ink Works/Branding/2024, Glide Graph/Web design/2024,
   Pixel Pod/Web design/2024, Snap Tint/Branding/2023,
   Visual Blend/Branding/2023.
7. **About us row** — left label "● About us", right paragraph.
8. **Stats grid**, 2×2 of big numbers with captions: 60 "Projects
   complete", 25 "Years of experience", 34 "Awards received", 01 "Happy
   developer".
9. **Footer** — "©Copyright 2025" left; Style guide / Licenses /
   Changelog right.

Nest it properly — `Section > Container > Grid/Stack > content`. Depth
is a feature here, not bloat: 4–6 levels in places is wanted, because
that is what exercises the Navigator's indentation.

### Constraints

- Only these component types exist. Read `builder/components/index.ts`
  and each component file to confirm props before use: `Page`,
  `Section`, `Container`, `Stack`, `Heading`, `Text`, `Image`, `Button`,
  `Grid`, `Navbar`, `Footer`, `Link`, `LinkBlock`, `EmptyPlaceholder`,
  plus the portfolio plugins in `builder/plugins/portfolio/index.ts`
  (`ProfileHeader`, `ProjectCard`, `SkillGroup`, `LinksList`). Do not
  invent types — `validateAgainstRegistry` rejects unknown ones.
- Respect each component's `constraints`
  (`allowedParents`/`allowedChildren`/`rootOnly`). `Page` is `rootOnly`.
- Node ids unique across the document.
- Styles are per-breakpoint with camelCase properties:
  `{ base: {...}, lg: {...} }`.
- Prefer **longhand** spacing (`paddingTop`, `marginBottom`, …) over the
  `padding`/`margin` shorthands — see Stage 3, item 4 for why.
- Keep images as inline data-URI SVG placeholders as the current file
  does. No network fetches.
- The script must still call `validatePortfolioDocument` and exit
  non-zero on failure.

### Acceptance

- `npx tsc --noEmit` introduces no new errors from this file.
- The document passes `validatePortfolioDocument` — prove it, do not
  assume it. A scratch Vitest file that imports the document and asserts
  `valid === true` is the cheapest proof; delete it afterwards, or keep
  it if it earns its place.
- Report final node count and maximum tree depth.

---

## Stage 2 — Navigator panel

### Deliverable

New file `components/editor/Navigator.tsx`: the document tree as an
indented, clickable outline, equivalent to Webflow's Navigator.

### Requirements

1. Recursively walk `page.root` and render one row per node. Indent by
   depth.
2. Row label is `node.name`, falling back to `node.type` when unset.
   Show the component type as secondary/muted text when a name exists —
   a user renaming a node should not lose sight of what it actually is.
3. Clicking a row selects that node. Use the **existing** selection
   state — import `select` / `clearSelection` from
   `builder/canvas/selection` and read `canvasState.selection`, exactly
   as `components/editor/Canvas.tsx` already does. Do not introduce a
   second source of selection truth; canvas and navigator must stay in
   sync for free.
4. The currently-selected row is visibly highlighted.
5. Rows with children collapse/expand. Default to expanded — the whole
   point is seeing structure.
6. The page root row is selectable but must not be presented as
   deletable or draggable (`Canvas.tsx` already excludes the root from
   drag; match that).

### Explicitly out of scope for this stage

- **Renaming from the Navigator.** There is no command for it —
  `builder/history/types.ts` has `UpdateProps` and `UpdateStyles`, and
  `name` is neither a prop nor a style. Adding a rename means adding a
  command type and its inverse, which is engine work this plan does not
  cover. Names come from the Stage 1 seed for now. Note it as a
  follow-up in your report.
- Drag-to-reorder within the Navigator. Canvas drag already exists;
  duplicating it in the tree is a separate plan.

### Acceptance

- Seed the Stage 1 document into a portfolio, open the editor, and
  confirm the Navigator reproduces the seed's structure with readable
  names at correct depths.
- Selecting in the Navigator highlights the node on canvas, and
  selecting on canvas highlights the Navigator row. Both directions.
- `npx tsc --noEmit`, `npm test`, `npm run lint` clean.

---

## Stage 3 — Grouped Style panel

### Deliverable

Rewrite `components/editor/StyleInspector.tsx` to render
`STYLE_GROUPS` as a Webflow-style Design panel. Everything about how it
reads and writes state stays; only rendering and field-kind coverage
change.

### Requirements

1. Render `STYLE_GROUPS` as collapsible sections, using each group's
   `defaultOpen` for initial state. Check `components/ui/` for an
   existing accordion/collapsible primitive and reuse it. If none
   exists, `<details>`/`<summary>` or a small `useState` toggle is fine.
   **Do not add a dependency for this.**
2. Handle every `StyleFieldKind`, including the three new ones —
   `select` (dropdown from the field's own `options`), `number`,
   `text`. The six existing kinds (`color`, `spacing`,
   `typography-size`, `typography-weight`, `text-align`, `dimension`)
   must keep working exactly as they do today, including the
   token-dropdown-with-"Custom…"-escape-hatch behaviour.
3. Render a field's optional `hint` as small muted helper text under its
   control.
4. **Spacing correctness — the one behavioural change, and it matters.**
   The spacing group is now longhand-only. Legacy documents may still
   carry a `padding`/`margin` shorthand in a declaration. Because a
   declaration is a flat, insertion-ordered property bag, a leftover
   shorthand written after a longhand silently clobbers it. So: pass the
   declaration through `expandSpacingShorthand()` before dispatching any
   style command. Read that function's doc comment — it deliberately
   leaves multi-value shorthands like `"8px 16px"` alone rather than
   mis-splitting them.
5. Preserve breakpoint semantics untouched: the panel edits only the
   currently-selected breakpoint's declaration, and the existing
   explanatory note about blank fields inheriting from smaller
   breakpoints must survive (reword only if grouping makes it read
   oddly).
6. Preserve the existing command call convention exactly.
   `createUpdateStylesCommand(pageId, node, key, value)` is called with
   the **breakpoint** as `key` and the whole next declaration object as
   `value`, producing `styles: { base: {...} }`.
7. The panel is much taller now — it must scroll sanely and stay usable
   at a ~300px column width. Two-column rows for related short fields
   (e.g. the four margin sides) are welcome.

### Acceptance

- Every group renders; every field kind has a working control.
- Editing a padding side on a node whose declaration contains a legacy
  `padding` shorthand does not lose the other three sides.
- `npx tsc --noEmit`, `npm test`, `npm run lint` clean.
- Report any part of `fields.ts` that felt wrong or unusable from the UI
  side. That file is new and unproven; design feedback on it is wanted.

---

## Stage 4 — Editor shell: three columns + Toolbox popover

### Deliverable

Rework `components/editor/EditorClient.tsx` and
`components/editor/Toolbox.tsx` into the Webflow shell.

### Requirements

1. Desktop layout becomes `[Navigator | Canvas | Inspector]` —
   roughly `220px | 1fr | 300px`. The Toolbox is no longer a column.
2. The Toolbox becomes a **popover** triggered by an "Add element" / "+"
   button in the toolbar. Reuse an existing `components/ui/` primitive
   (popover/dropdown/sheet) — do not add a dependency. Its existing
   `onAdd` behaviour and `rootOnly` guard toast stay exactly as they
   are.
3. The mobile `<Tabs>` fallback gains a Navigator tab alongside
   Components / Canvas / Properties.
4. Do not change autosave, publish, embed, or export behaviour. This is
   layout only.

### Acceptance

- Adding a component from the popover still works, including the
  "can only be a page's root node" rejection path.
- Nothing regressed in save / publish / unpublish / export JSON.
- `npx tsc --noEmit`, `npm test`, `npm run lint` clean.

---

## Non-goals for this plan

- No Tailwind class generation (see Confirmed decisions).
- No rename-from-Navigator command (Stage 2 notes it as follow-up).
- No Navigator drag-to-reorder.
- No changes to `builder/document/`, `builder/registry/`,
  `builder/renderer/`, or `builder/styles/` beyond the Stage 0 files
  already landed. If a stage believes it needs an engine change, stop
  and report rather than making it.
- No new runtime dependencies. Call out any proposal explicitly in the
  final report.

## Overall acceptance criteria

- The Stage 1 seed document opens in the editor and its structure is
  legible in the Navigator without touching the canvas.
- The canvas no longer needs stacked "Empty X" labels to be navigable —
  confirm whether the editor-only `min-height: 8px` rule and the empty
  placeholders in `Canvas.tsx` are still earning their place, and report
  the finding. Do not remove them as part of this plan.
- `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run lint` all
  clean from the repo root.
