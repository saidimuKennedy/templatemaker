# Plan 13 — Pointer Drag-and-Drop (closes Phase 3)

## Objective

`docs/06-development-roadmap.md` Phase 3 lists "Drag and drop" as a v1
item. The entire engine side is already built and smoke-tested
(`builder/canvas/drag.ts`: `beginDrag`, `updateDropTarget`,
`resolveDropCommand`, `endDrag`), but **nothing wires pointer events to
it** — verified: grep for `onDrop|draggable|onPointerMove|beginDrag`
across `components/editor/` returns zero hits. Today you reorder nodes
with Up/Down buttons. This plan wires the UI so the existing state
machine is actually driven by dragging.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, do not modify):
- `builder/canvas/drag.ts` — the full drag state machine. `resolveDropCommand`
  already handles the same-parent index-shift correctly (verified with a
  3-sibling reorder test), so **do not reimplement drop index math**.
- `builder/canvas/types.ts` — `CanvasState.dragging`, `CanvasState.dropTarget`,
  `DropTarget { nodeId, position: "before" | "after" | "inside" }`.
- `builder/history/session.ts` — `EditorSession.execute` applies the
  resulting `MoveNode` command (undo/redo comes free).
- `components/editor/Canvas.tsx` — owns click-to-select, the selection
  overlay, keyboard actions, and the Up/Down/Delete toolbar. Note it
  calls `event.preventDefault()` in `handleCanvasClick` so rendered
  anchors don't navigate; your drag handlers must not break that.
- Every rendered node carries `data-node-id` on its root element.

## Deliverables

All in `components/editor/Canvas.tsx` (plus a small helper file if it
grows past ~100 lines of drag logic — `components/editor/useCanvasDrag.ts`).

### Use HTML5 drag events, not raw pointer math

Use `draggable`, `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`,
`onDragEnd` — delegated on the canvas container, the same way click is
delegated today. Rationale: the browser handles the drag lifecycle,
autoscroll, and the drag image for free. Do not hand-roll
pointermove/pointerup tracking; that's a much larger surface for a
worse result.

Because nodes are rendered by registered components (which you must not
modify), set `draggable` by delegation: on `onDragStart` at the
container, resolve `event.target.closest("[data-node-id]")` to get the
dragged node id, and call `beginDrag(canvasState, nodeId)`. Set
`draggable` on the canvas container's rendered wrapper via a
`useEffect` that stamps `draggable="true"` onto each `[data-node-id]`
element after render (keyed on `documentVersion`), or set it on the
wrapper div and rely on event delegation — pick whichever you can make
work reliably and say which in your report.

### Drop-target resolution

On `onDragOver` over an element with `data-node-id`:
- Compute the hovered element's `getBoundingClientRect()`.
- If the hovered node accepts children (check
  `registry.get(type)?.constraints.allowedChildren` — `undefined` means
  any, `[]` means none) **and** the cursor is in the middle 50% band
  vertically, the position is `"inside"`.
- Otherwise `"before"` if the cursor is in the top half, `"after"` if
  bottom half.
- Call `updateDropTarget(state, { nodeId, position })`. Call
  `event.preventDefault()` on `onDragOver` — without it the browser
  refuses the drop.

### Drop indicator

Render a visible indicator from `canvasState.dropTarget`, reusing the
existing absolutely-positioned-overlay technique already used for the
selection outline:
- `"before"` / `"after"` → a 2px horizontal line at the top/bottom edge
  of the target element.
- `"inside"` → a 2px outline around the whole target element.

### Commit the drop

On `onDrop`: `resolveDropCommand(session.getDocument(), pageId,
draggedNodeId, dropTarget)`; if it returns a command, `session.execute`
it and bump `documentVersion`. Then `endDrag`. On `onDragEnd` always
`endDrag` (covers cancelled drags).

`resolveDropCommand` already returns `undefined` for self-drops and
unresolvable targets — treat `undefined` as a silent no-op, don't error.

### Keep Up/Down working

Do not remove the Up/Down/Delete toolbar. It's the accessible,
keyboard-reachable path and drag-and-drop is not a replacement for it.

## Non-goals

- No cross-page dragging (v1 documents have a single page).
- No drag-to-create from the Toolbox (clicking a Toolbox item to insert
  is the existing behaviour and stays).
- No autoscroll tuning, snapping, or drag ghost customisation.
- Don't modify `builder/canvas/*`, `builder/history/*`, or any component
  renderer.

## Acceptance criteria

- `npx tsc --noEmit`, `npm run build`, `npm run lint` clean (no new
  issues beyond the two pre-existing `components/ui` errors).
- Manual, in a real browser against a real document:
  1. Drag a `Text` node above its sibling → order changes, and the
     change survives Save + reload.
  2. Drag a node into an empty `Stack` (which shows the "Empty Stack"
     placeholder) → it nests inside.
  3. Cmd/Ctrl+Z after a drag restores the previous order.
  4. Dragging a node onto itself does nothing and does not error.
  5. Clicking a `Link`/`LinkBlock` in the canvas still selects it and
     still does **not** navigate (regression check on the
     `preventDefault` behaviour).
