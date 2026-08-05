# Plan 06 — Canvas Engine

## Do this last

Per the relayed build-order guidance this whole `docs/plans/` split is
based on: **"I would not build the UI first... the editor becomes a
relatively thin layer over a working engine"** at this point. Do not
start this plan until Plans 01–03 have landed (Engine Core, Built-in
Components, Style Engine) — Canvas is the one piece that needs
something real to select, drag, and resize. Plans 04 (Inspector) and 05
(Publish) are not hard prerequisites but check `docs/plans/README.md`'s
status table before starting in case they've also landed.

## Objective

Implement the Canvas Engine per `docs/04-engine-specification.md` and
section 4 of `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md`: selection,
dragging, resizing, hover, drop targets, keyboard navigation. Critically,
per that same spec: **"It never knows what component is being
manipulated."** The canvas operates purely in terms of `NodeId`s,
`Command`s, and geometry — it must not import anything from
`builder/components/`.

## Context

Read `builder/CONTRIBUTING.md` first. Rule 3 ("all edits go through
commands") and the Engine Specification's rule ("the canvas never edits
the document directly") are the two rules this whole plan exists to
enforce.

Already implemented (read, don't modify):
- `builder/history/session.ts` — `EditorSession` (`getDocument()`,
  `execute(command)`, `undo()`, `redo()`). The canvas drives the
  document exclusively through this — never through
  `builder/history/commands.ts` directly, and never by touching
  `BuilderDocument` fields.
- `builder/document/types.ts` — `BuilderNode`, `NodeId`.
- `builder/document/tree.ts` — `findNodeAndParent` — useful for
  read-only geometry/hierarchy queries (e.g. "what's the parent of the
  hovered node") without needing your own tree-walking code.
- `builder/history/types.ts` — `Command`, specifically
  `MoveNodePayload { pageId, nodeId, newParentId, newIndex }` — this is
  what a completed drag operation must produce.

## Deliverables

Directory: `builder/canvas/`.

### `builder/canvas/types.ts`

```ts
export interface CanvasSelection {
  readonly pageId: PageId;
  readonly selectedNodeIds: readonly NodeId[];
}

export type DropPosition = "before" | "after" | "inside";

export interface DropTarget {
  readonly nodeId: NodeId;
  readonly position: DropPosition;
}

export interface CanvasState {
  readonly selection: CanvasSelection | null;
  readonly hoveredNodeId: NodeId | null;
  readonly dragging: { readonly nodeId: NodeId } | null;
  readonly dropTarget: DropTarget | null;
}
```

### `builder/canvas/selection.ts`

Pure functions over `CanvasState`/`CanvasSelection` — no React, no DOM:
`select(pageId, nodeId, options?: { additive?: boolean })`,
`clearSelection()`, `isSelected(state, nodeId)`. These return new
`CanvasState` values; nothing here touches a document.

### `builder/canvas/drag.ts`

The important piece. Pure functions that turn drag gestures into a
`Command`, without performing any DOM measurement themselves (that's an
application/React-hook concern layered on top of this, out of scope for
the engine):

```ts
export function beginDrag(state: CanvasState, nodeId: NodeId): CanvasState;
export function updateDropTarget(state: CanvasState, target: DropTarget | null): CanvasState;
export function resolveDropCommand(
  document: BuilderDocument,
  pageId: PageId,
  draggedNodeId: NodeId,
  drop: DropTarget,
): Command | undefined;
export function endDrag(state: CanvasState): CanvasState;
```

`resolveDropCommand` is where `DropPosition` gets turned into a concrete
`newParentId`/`newIndex` for a `MoveNode` command:
- `"inside"` → `newParentId = drop.nodeId`, `newIndex` = append (append
  semantics already exist in `insertNode` from `builder/document/tree.ts`
  when `index` is omitted — reuse that by omitting `newIndex` if your
  `MoveNodePayload` allows it, otherwise compute the target's current
  child count via `findNodeAndParent`).
- `"before"`/`"after"` → find `drop.nodeId`'s parent and index via
  `findNodeAndParent(page.root, drop.nodeId)`, then
  `newParentId = parent.id`, `newIndex = index` (for `"before"`) or
  `index + 1` (for `"after"`).
- Return `undefined` (not a command) if `drop.nodeId === draggedNodeId`
  or if the drop target can't be resolved — let the caller decide
  whether to no-op or show an error; don't throw from a pure planning
  function.
- Do **not** re-implement the cycle-guard (moving a node into its own
  descendant) here — `builder/history/commands.ts`'s `applyMoveNode`
  already rejects that by construction (removing the subtree first,
  then trying to insert into it, which fails). Your job is just
  producing the `Command`; let `EditorSession.execute` surface the
  failure if one occurs.

### `builder/canvas/resize.ts`

```ts
export function resolveResizeCommand(
  pageId: PageId,
  nodeId: NodeId,
  dimension: "width" | "height",
  value: number | string,
): Command;
```
Resizing is modeled as a styles edit: return an `UpdateStyles` command
with `payload.styles = { [dimension]: value }`. If Plan 03 (Style
Engine) has landed, prefer its `NodeStyleRules` shape (put the value
under the `"base"` breakpoint) and note the coupling in your report; if
it hasn't landed yet, fall back to a flat `{ [dimension]: value }` and
note that as a follow-up for whoever finishes Plan 03.

### `builder/canvas/keyboard.ts`

```ts
export type CanvasKeyAction = "delete" | "duplicate" | "undo" | "redo" | "deselect";

export function resolveKeyAction(event: { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }): CanvasKeyAction | undefined;
```
Map common shortcuts (Delete/Backspace → `"delete"`, Cmd/Ctrl+D →
`"duplicate"`, Cmd/Ctrl+Z → `"undo"`, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y →
`"redo"`, Escape → `"deselect"`). Pure mapping function only — actually
attaching a `keydown` listener is an application/React concern outside
the engine.

### `builder/canvas/index.ts`

Barrel exporting all of the above.

## Non-goals

- No React components, no DOM event listeners, no actual pointer-drag
  math (element bounding boxes, snapping thresholds, etc.) — this plan
  is the pure command/state-transition layer the eventual editor UI
  will wire pointer events into. That UI layer is out of scope for the
  engine entirely (see `docs/06-development-roadmap.md` Phase 3).
- Don't import anything from `builder/components/`.
- Don't modify `builder/history/*` or `builder/document/*`.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: given a small tree (`Page > Section > [Heading, Text]`),
  `resolveDropCommand` for dropping `Text` `"before"` `Heading` produces
  a `MoveNode` command with `newParentId` = `Section`'s id and
  `newIndex = 0`; running that command through
  `createEditorSession(document).execute(command)` actually reorders
  the children as expected.
- Smoke check: `resolveDropCommand` returns `undefined` when
  `drop.nodeId === draggedNodeId`.
- Smoke check: `resolveKeyAction` correctly distinguishes Cmd+Z (undo)
  from Cmd+Shift+Z (redo).
