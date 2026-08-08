# Plan 24 — Surface Unreachable Engine Capabilities

## Objective

The engine was built to spec from `docs/02`–`docs/05`. The editor UI only
ever surfaced the subset needed to make the portfolio use case work. The
result is a set of capabilities that are modelled, validated, serialized,
and unit-tested — and that no user can reach.

This plan closes that gap. It is almost entirely **UI work against
existing engine APIs**; where an engine change is genuinely required it is
called out explicitly, because "the engine already does this" is the
premise of most of these stages and the exceptions matter.

## Audit — what exists but is unreachable

| # | Capability | Engine support | UI status |
|---|---|---|---|
| 1 | Multi-page documents | `BuilderProject.pages[]`, per-page `name`/`path`, duplicate-page-id validation | `pages[0]` hardcoded (`EditorClient.tsx:133,316`) |
| 2 | Multi-select | `selectedNodeIds` is an array; add/toggle logic in `builder/canvas/selection.ts:19-27` | All 3 consumers read `[0]` |
| 3 | `sm` / `md` breakpoints | Style Engine resolves 4; `responsive.ts` emits `@media` for sm/md/lg | `ViewportToggle.tsx:13-14` offers only `base` and `lg` |
| 4 | Node resize | `resolveResizeCommand` (`builder/canvas/resize.ts`) | Zero callers; no handles on canvas |
| 5 | `renderPreview` | `builder/publish/preview.ts`, tested | Zero app callers |
| 6 | `color` / `image` property fields | Declared in `builder/registry/types.ts:22-31` | `Inspector.tsx` falls through to plain text input |
| 7 | Undo / redo | `EditorSession.undo()/redo()`, keyboard map handles Ctrl+Z/Y | No buttons; shortcut only fires when canvas has DOM focus |
| 8 | Design tokens | `defaultTokens` drives Style panel dropdowns | Read-only; no editor |

## Context every agent must read first

- `builder/CONTRIBUTING.md` — mutations go through the Command API.
- `AGENTS.md` — **this is not the Next.js you know.** Read the relevant
  guide in `node_modules/next/dist/docs/` before writing Next.js code.
- `docs/V1-COMPLETION.md` — the sign-off, including the published-styles
  cascade bug that Plan 23 fixes. Stage 1 here interacts with it.

**This plan is staged. Stop for review after each stage.** The stages are
ordered by cost and risk, not by the audit numbering.

---

## Stage 1 — Cheap, high-value (items 3, 7, 6)

### 1a. Expose `sm` and `md` viewports (item 3)

**Why this is first:** it is two array entries, and without it *half the
responsive system is unauthorable*. `responsive.ts` faithfully emits
`@media` rules for sm and md, and `StyleInspector` will happily edit
whichever breakpoint is active — but no user can ever select sm or md, so
the only way such an override exists today is a seed script. Combined with
the Plan 23 cascade bug, the responsive feature was doubly unreachable.

Add `sm` and `md` to `VIEWPORTS` in `components/editor/ViewportToggle.tsx`.

- `VIEWPORT_MAX_WIDTH` in `Canvas.tsx` already defines all four
  (`base: 390px`, `sm: 640px`, `md: 768px`, `lg: 100%`). No change needed.
- Use labels consistent with `BREAKPOINT_LABELS` in
  `components/editor/StyleInspector.tsx` (Mobile / Small / Tablet /
  Desktop) — two different names for one breakpoint is worse than a bad
  name.
- Four buttons need four distinguishable icons, not two reused ones.
- Note `lg` maps to `100%`, not `1024px` — Desktop is fluid by design.
  Don't "fix" it to a fixed width.

### 1b. Surface undo/redo (item 7)

Undo/redo works but is invisible and focus-scoped: `onKeyDown` lives on
the canvas container (`Canvas.tsx:451,457`), so pressing Ctrl+Z after
clicking a Navigator row does nothing.

**Engine change required:** `EditorSession` exposes `undo()`/`redo()` but
not `canUndo`/`canRedo`. Those exist on the `History` interface
(`builder/history/types.ts:98-99`) and simply aren't surfaced. Add them to
`EditorSession` in `builder/history/session.ts` — without them, toolbar
buttons cannot be correctly disabled at the ends of the stack and will sit
there looking clickable while doing nothing.

Then:
- Add Undo/Redo buttons to the `EditorClient` toolbar, disabled per
  `canUndo`/`canRedo`.
- Lift the keyboard shortcut from the canvas to the editor shell so it
  works regardless of which panel has focus.
- **Exempt text inputs.** When focus is in an Inspector field or the
  Navigator's inline rename input, Ctrl+Z must do *native text* undo, not
  roll back a document command. Check the event target for
  `input`/`textarea`/`contenteditable` and bail. Getting this wrong makes
  editing a heading infuriating.
- Undo/redo must bump `documentVersion` so the canvas re-renders —
  `runHistoryAction` does this in `Canvas.tsx` today; ownership moves to
  `EditorClient`.

### 1c. Real controls for `color` and `image` props (item 6)

`Inspector.tsx`'s `FieldControl` implements `boolean`, `select`,
`richtext`, and `number`; everything else falls through to a text input.
So a declared `color` prop means typing a hex string with no swatch, and
an `image` prop means pasting a URL by hand.

- `color`: a native swatch **plus** a text field. The text field is not
  optional — `<input type="color">` cannot express `transparent`,
  `currentColor`, or a CSS variable, all of which are legitimate values.
- `image`: URL field with a thumbnail preview. The seed fixture uses
  inline `data:` URIs, so the preview must render those, not just `http`.
- **Upload is out of scope.** It needs blob storage that doesn't exist in
  this project yet. Note it as a follow-up; do not add a storage
  dependency inside this plan.

### Stage 1 acceptance

- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build` clean.
- **In the browser:** select a node, switch to Small and Tablet, set a
  font-size override at each, publish, and confirm all four breakpoints
  respond to real viewport width. (This depends on Plan 23 having landed —
  if it hasn't, the overrides will be emitted but overridden by inline
  base styles. Verify Plan 23 first or this check is meaningless.)
- Undo/redo buttons disable correctly at both ends of the stack.
- Ctrl+Z works after clicking a Navigator row; Ctrl+Z inside an Inspector
  text field undoes *typing*, not the last document command.

---

## Stage 2 — Multi-select (item 2)

`builder/canvas/selection.ts` already implements accumulating selection.
Nothing calls it.

- Shift-click (or Ctrl/Cmd-click) to add to selection, in **both** the
  Navigator and the canvas.
- Render every selected node's outline on the canvas, not just the first.
- The Navigator highlights all selected rows.

### 2a. First: a composite command (engine)

**Do this before any multi-select UI.** Commands are single-node
(`DeleteNode` takes one `nodeId`). Deleting five selected nodes therefore
means five commands, which means **five separate undo steps** — the user
presses Ctrl+Z once, four nodes are still gone, and undo looks broken.

Add a composite command to the engine: applies an ordered list of
commands, inverts as a single unit (inverses applied in reverse order),
and occupies exactly one slot in History. This means a new member of the
`Command` union in `builder/history/types.ts` plus both exhaustive
switches in `builder/history/commands.ts` — the compiler will point at
both. Partial failure must roll back rather than leave the document half
mutated.

**This is not a multi-select detail, which is why it comes first and gets
its own decision record.** Plan 19 (AI Page Generation) emits many
commands per generation; without a composite, one AI generation becomes
dozens of undo steps and "undo what the AI did" is unusable. Plan 20's
animation work has the same shape. Build it once, here, properly.

Record the decision as **`docs/decisions/ADR-009-composite-commands.md`**
(008 is taken by the document-evolution ADR) so Plan 19 inherits it
instead of re-deciding it under deadline. Cover: why History treats a
composite as one entry, the reverse-order inversion rule, and the
rollback-on-partial-failure guarantee.

### 2b. Then: the selection UI

**Scope guard:** the Inspector must not attempt to edit props/styles
across a multi-selection in this stage. Showing "3 selected" and disabling
the fields is the correct v1 behaviour. Merging common values across a
heterogeneous selection is a genuinely hard UI problem and is not what
this plan is for.

### Stage 2 acceptance

- Shift-click accumulates in both panels; all selected nodes are outlined.
- Delete on a multi-selection removes all of them and **a single Ctrl+Z
  restores all of them** (if you took option 1), or the operation is
  disabled with a visible reason (option 2).
- Single-select behaviour is completely unchanged.

---

## Stage 3 — Multi-page (item 1)

The largest stage, and it needs engine work.

**Engine change required:** the `Command` union has no page-level
mutations — `CreateNode`/`MoveNode`/`DeleteNode`/`UpdateProps`/
`UpdateStyles`/`RenameNode` are all node-scoped. Adding, renaming,
deleting, or reordering a page needs new commands with inverses, added to
the union and to both exhaustive switches in `builder/history/commands.ts`
(the compiler will point at both).

### 3a. First: make publishing page-aware

**This is ordered first deliberately — it is not a caveat on the editor
work.** `renderPublished` → `renderResponsive` →
`renderer.renderDocument()` maps over **every** page and concatenates them
into one fragment. A second page today would silently append itself to the
bottom of the published site.

So publishing must become page-aware *before* any page switcher exists,
otherwise Stage 3 ships a feature that breaks the product the moment
someone uses it. This work and 3b must land together — a multi-page editor
without multi-page publishing is broken, and multi-page publishing with no
editor is untestable. That is why they are one stage rather than two plans.

Required:
- Per-page routing: `/p/[slug]/[...path]` or equivalent, plus the same
  treatment for `app/embed/[slug]/`.
- A decision on which page is the index, and what a request for an unknown
  path does.
- `renderPublished` / `renderEmbedded` render **one** page, not all of
  them. Check whether `renderDocument` still has a caller afterwards; if
  not, say so rather than leaving it as another unreachable export (see
  item 5).
- Existing single-page portfolios must keep working at their current URLs.
  This is live published content — a routing change that 404s existing
  links is a regression, not a migration.

### 3b. Then: the page management UI

Also:
- `BuilderPage.path` exists and is unused. It is the natural routing key —
  validate uniqueness the way page ids already are.
- `EditorClient.tsx:133,316` hardcode `pages[0]`. Both become
  "current page", which is new editor state (not document state — per
  ADR-001 the document is the source of truth, and "which page am I
  looking at" is not document content).
- Deleting the last remaining page must be rejected;
  `validateDocumentStructure` already requires at least one page.

### Stage 3 acceptance

- Create, rename, reorder, and delete pages; each is undoable.
- Deleting the final page is refused with a clear message.
- **Publish a two-page document and load both pages at distinct URLs.**
  Concatenated output is a failure, not a caveat.

---

## Stage 4 — Deferred items (4, 5, 8)

Do **not** build these as part of Stages 1–3. Listed so they stop being
invisible.

**Item 4 — resize handles.** `resolveResizeCommand` exists and is
callable. The UI is the work: pointer handles on the selection overlay,
which currently has `pointerEvents: "none"` (`Canvas.tsx`). Two decisions
first — which breakpoint a drag writes to (it must be the currently
selected viewport, or a desktop drag silently rewrites the mobile layout),
and whether resizing writes `width`/`height` or flex properties.

**Item 5 — `renderPreview`.** Zero app callers. Decide: adopt it, or
delete it and its tests. Exported, tested, unused code is a standing
invitation to wire up the wrong thing later.

**Item 8 — design token editor.** Making tokens per-project means storing
them in the document. Per
[ADR-008](../decisions/ADR-008-additive-document-evolution.md) this must
be an **optional** field falling back to `defaultTokens`, and it does
**not** bump `schemaVersion`. That also means this no longer collides
with Plan 20 — both add optional fields, neither versions, so they can
land in any order.

---

## Non-goals

- No new runtime dependencies without calling it out explicitly.
- No image upload / blob storage (Stage 1c).
- No cross-selection property merging in the Inspector (Stage 2).
- No changes to the renderer, registry, or document model beyond the
  command additions each stage names.
- Nothing from `docs/01`'s v1 exclusion list: real-time collaboration,
  plugin marketplace, full CMS.

## Overall acceptance

- Each stage independently passes `npx tsc --noEmit`, `npm test`,
  `npm run lint`, `npm run build`.
- Each stage is **verified in a browser** against the seeded fixture
  (portfolio `mcspgmfhb3cxb4jm`). These are all UI-surfacing changes;
  static checks cannot tell you whether a capability is actually reachable,
  which is the entire subject of this plan.
- Report what you saw, not just that checks passed. If something could not
  be verified, say so plainly.
