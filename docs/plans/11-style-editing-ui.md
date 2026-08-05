# Plan 11 — Style Editing UI

## Objective

The Style Engine (Plan 03) can already store and resolve arbitrary CSS
per node (`NodeStyleRules`, `resolveNodeStyle`, `createStyledRenderer`),
and the Inspector's command layer already has `createUpdateStylesCommand`
(Plan 04) — but no UI ever calls it. Today a user can edit component
*props* (text content, URLs, booleans) but has **no way to change font
size, color, spacing, alignment, or size** through the editor at all.
This plan closes that gap: a "Design" panel in the Inspector that reads
and writes real style values through the existing engine.

## Do this first, before anything else in this plan

**Confirmed bug**: none of the 8 generic built-in components in
`builder/components/*` (`Page`, `Section`, `Container`, `Stack`,
`Heading`, `Text`, `Image`, `Button`) apply `props.style` to their root
DOM element — only the 4 portfolio business components
(`builder/plugins/portfolio/*`, built after the Style Engine existed)
do. Verified via `grep -n "props.style" builder/components/*.tsx` — zero
matches outside `Image`'s own unrelated hardcoded style object and
`Stack`/`Section`'s own derived styles. This means resolved styles from
`createStyledRenderer` would currently be silently dropped for every
commonly-used component. **Fix this before building any UI on top of
it**, or the new panel will appear to do nothing.

For each of `Page`, `Section`, `Container`, `Stack`, `Heading`, `Text`,
`Image`, `Button`: destructure `style` from `props` (cast
`props.style as React.CSSProperties | undefined`) and merge it onto the
component's own computed style on its root element — e.g. `Section`
currently does `style={{ padding: PADDING_MAP[padding] ?? PADDING_MAP.md }}`;
change to `style={{ padding: PADDING_MAP[padding] ?? PADDING_MAP.md, ...style }}`
so resolved node styles win over the component's own defaults (matches
how `mergeStyleIntoProps` already treats an existing `props.style` as
lower-priority — see `builder/styles/apply.ts`'s `mergeStyleObjects`).
For components with no existing inline style (`Page`, `Container`,
`Heading`, `Text`, `Button`), just add `style={style}` to the root
element. Match the exact pattern already used in
`builder/plugins/portfolio/profile-header.tsx` etc.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, don't modify beyond the fix above):
- `builder/styles/types.ts` — `NodeStyleRules`, `Breakpoint`,
  `ResolvedStyleDeclaration`.
- `builder/styles/tokens.ts` — `defaultTokens` (colors, spacing,
  typography scale).
- `builder/styles/resolve.ts` — `resolveNodeStyle` (mobile-first
  cascade).
- `builder/styles/apply.ts` — `createStyledRenderer`,
  `mergeStyleIntoProps`. `Canvas.tsx` (`components/editor/Canvas.tsx`)
  already wraps `createRenderer()` with `createStyledRenderer(...,
  "base")` — so once the built-in-component fix above lands, style
  changes should show up in the canvas with **zero changes to
  Canvas.tsx**.
- `builder/inspector/edit.ts` — `createUpdateStylesCommand(pageId, node,
  key, value)`. This already produces a correct `UpdateStyles` command;
  you are wiring UI to an existing, tested function, not building new
  command logic.
- `components/editor/Inspector.tsx` — currently only renders
  `InspectorField`s from `buildInspectorModel` (props only) and only
  ever calls `createUpdatePropsCommand`. You're adding a second section/
  tab alongside it, not replacing it.
- `components/ui/*` — reuse `Select`, `Input`, `Label` the same way
  `Inspector.tsx` already does.

Known, deliberate scope limits carried over from Plan 09 (don't attempt
to fix in this plan): styles are edited and rendered at breakpoint
`"base"` only — no `sm`/`md`/`lg` switcher yet. Note it as a natural
follow-up in your report, but a breakpoint switcher is a separate,
larger UI (viewport-size control + which breakpoint is "active" for
edits) and is explicitly out of scope here.

## Deliverables

### `builder/styles/fields.ts` (new — the "design token vocabulary")

Rather than a freeform CSS property/value text box (error-prone, not
in the spirit of "JSON is the source of truth" with sane, bounded
inputs), define a fixed, curated set of editable style fields — this is
the same idea as `PropertyField`/`propertySchema` in the registry, but
for styles instead of props:

```ts
export interface StyleField {
  readonly key: string;              // CSS property name, e.g. "fontSize"
  readonly label: string;
  readonly kind: "color" | "spacing" | "typography-size" | "typography-weight" | "text-align" | "dimension";
}

export const STYLE_FIELDS: readonly StyleField[] = [
  { key: "color", label: "Text color", kind: "color" },
  { key: "backgroundColor", label: "Background", kind: "color" },
  { key: "padding", label: "Padding", kind: "spacing" },
  { key: "margin", label: "Margin", kind: "spacing" },
  { key: "fontSize", label: "Font size", kind: "typography-size" },
  { key: "fontWeight", label: "Font weight", kind: "typography-weight" },
  { key: "textAlign", label: "Text align", kind: "text-align" },
  { key: "width", label: "Width", kind: "dimension" },
  { key: "height", label: "Height", kind: "dimension" },
];
```
Every field applies to every node — there is no per-component style
schema (that's a bigger idea, worth flagging as a future enhancement in
your report, not building now). `"color"`/`"spacing"`/`"typography-size"`/
`"typography-weight"` kinds should offer **token-backed choices first**
(a `<Select>` populated from `defaultTokens.colors`/`.spacing`/
`.typography`, by key name) with a small "Custom…" option that reveals
a free-text input for an escape hatch — this matches the architecture
doc's design-token intent instead of a bare color/number picker.
`"text-align"` is a fixed `<Select>` (`left`/`center`/`right`).
`"dimension"` is a free-text input (accepts `"100%"`, `"320px"`, etc. —
don't over-validate, `resolveNodeStyle` already just passes values
through as CSS).

### `components/editor/StyleInspector.tsx` (new)

Client component, sibling to the existing field-rendering logic in
`Inspector.tsx`. Props: `pageId: PageId`, `node: BuilderNode`,
`onCommand: (command: Command) => void`.

- For each `StyleField` in `STYLE_FIELDS`, read the current value from
  `node.styles` — treat it as `NodeStyleRules` (per
  `builder/styles/types.ts`'s documented convention) and read
  `(node.styles as NodeStyleRules).base?.[field.key]`.
- Render the appropriate control per `kind` (token `<Select>` +
  "Custom…" text input, as described above).
- On change, call `onCommand(createUpdateStylesCommand(pageId, node,
  field.key, value))` — note `createUpdateStylesCommand`'s existing
  signature takes a single top-level `key`/`value` pair for
  `payload.styles`; since the real shape is `{ base: { [cssProp]:
  value } }`, either call it with `key: "base"` and a value that's the
  *entire* merged base-declaration object (read the current `base`
  declaration, spread in the one changed property, pass the whole
  object as `value`) — this matches `UpdateStyles`'s shallow-merge
  semantics (merges at the `styles` top level, i.e. per-breakpoint, not
  per-CSS-property) — don't try to merge at the CSS-property level via
  multiple small commands, one command per field edit is correct and
  matches Plan 04/Plan 09's existing one-field-one-command pattern.

### `components/editor/Inspector.tsx` (extend, don't rewrite)

Add a simple two-section layout (or reuse `components/ui/tabs` the same
way `EditorClient.tsx` already does for its own panel split): "Content"
(existing prop fields, unchanged) and "Design" (new `StyleInspector`).
Keep the existing unknown-component-type warning behavior for the
Content section; `StyleInspector` should render regardless of whether
`buildInspectorModel` succeeds, since styles apply to any node
independent of its registered prop schema.

## Non-goals

- No breakpoint switcher (`sm`/`md`/`lg` editing) — `"base"` only.
- No per-component style schema — the same fixed `STYLE_FIELDS` list
  applies to every node type.
- No rich color picker (swatches/hue wheel) — token `<Select>` + custom
  hex input is enough.
- Don't touch `builder/canvas/*`, `builder/history/*`, or
  `builder/registry/*`.
- Don't build layout primitives (`Grid`, `Navbar`, justify/align on
  `Stack`) — that's Plan 12, a separate concern from style editing.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes, `npm run build` succeeds,
  `npm run lint` introduces no new errors.
- Smoke check (can be a plain script, doesn't need the browser): after
  applying the built-in-component fix, render a `Heading` node with
  `styles: { base: { fontSize: "48px", color: "#2563eb" } }` through
  `createStyledRenderer(createRenderer(), "base")` and confirm the
  resulting HTML (via `renderToStaticMarkup`, same technique other
  plans' smoke tests already use) contains both resolved style values
  on the rendered element — this is the regression test proving the
  built-in-component fix actually works, independent of any UI.
- Manual/browser check if DB access is available: select a `Heading` in
  the canvas, change its font size and color via the new Design panel,
  and confirm the canvas re-renders with the new style live (no page
  reload needed) — this exercises `EditorSession.execute` →
  `documentVersion` bump → re-render, the same flow every other command
  in this app already uses.
