# Plan 14 — v1 Correctness Pass

## Objective

Close the correctness gaps found by dogfooding a real page through the
live editor. These are small individually but each one is a real defect
a user hits within minutes of using the builder.

Can run in parallel with Plan 13 (that plan owns
`components/editor/Canvas.tsx`; this one owns `builder/components/*`,
`builder/plugins/portfolio/*`, and `builder/canvas/duplicate.ts`) —
except item 1, which touches `Canvas.tsx`. Coordinate: if 13 is in
flight, land item 1 after it.

## Context

Read `builder/CONTRIBUTING.md` first.

## Deliverables

### 1. Implement node duplication

`components/editor/Canvas.tsx:187` currently has:
```ts
if (action === "duplicate") {
  // TODO: node duplication is a follow-up.
  return;
}
```
`resolveKeyAction` already maps Cmd/Ctrl+D to `"duplicate"`.

Add `builder/canvas/duplicate.ts`:
```ts
export function cloneNodeWithNewIds(node: BuilderNode): BuilderNode
export function resolveDuplicateCommand(
  document: BuilderDocument, pageId: PageId, nodeId: NodeId,
): Command | undefined
```
`cloneNodeWithNewIds` deep-clones and assigns a fresh `generateNodeId()`
to the node **and every descendant** — reusing ids would produce a
document that fails `validateDocumentStructure`'s duplicate-id check.
`resolveDuplicateCommand` finds the node's parent and index via
`findNodeAndParent`, and returns a `CreateNode` command inserting the
clone at `index + 1`. Return `undefined` for the page root (can't
duplicate a root next to itself).

Wire it in `Canvas.tsx` and add a "Duplicate" button to the existing
selected-node toolbar next to Up/Down/Delete.

### 2. Constrain `Page` so it can't nest

`builder/components/page.tsx` has `constraints: {}`. Because
`validateAgainstRegistry` only checks constraints a component actually
declares, nothing stops a `Page` being inserted inside a `Section` — I
found exactly that in a real saved document during dogfooding.

The registry can't express "root only" today. Add it: extend
`NodeConstraints` in `builder/registry/types.ts` with an optional
`rootOnly?: boolean`, set `rootOnly: true` on `PageComponent`, and
enforce it in `validateAgainstRegistry` (`builder/document/validate.ts`)
— a `rootOnly` component is invalid anywhere except as `page.root`.
Also enforce it at insert time so the editor refuses it rather than
producing an invalid document: check it in `EditorClient`'s
`handleAddComponent` before building the `CreateNode` command.

This is a deliberate contract change to `builder/registry` — note it
clearly in your report since other plans read that file.

### 3. Empty content components must stay selectable

`EmptyPlaceholder` fixed empty *containers*, but leaf components whose
props are all empty strings still collapse to an unclickable sliver — a
fresh `ProjectCard` (all props default to `""`) renders ~2px tall and
cannot be clicked to select, so the user can never fill it in. Verified
live.

Give every leaf component a visible fallback when it has no content:
- `builder/components/heading.tsx`, `text.tsx`, `button.tsx`,
  `link.tsx` — already fall back to placeholder text ("Heading",
  "Text", "Button", "Link"). Verify and leave alone.
- `builder/plugins/portfolio/profile-header.tsx`, `project-card.tsx`,
  `skill-group.tsx`, `links-list.tsx` — when **all** of a component's
  content props are empty, render the shared `EmptyPlaceholder` with a
  label naming the component (e.g. "Empty ProjectCard") instead of
  empty tags. When *some* props are set, render normally.

`EmptyPlaceholder` lives in `builder/components/empty-placeholder.tsx`;
importing it from `builder/plugins/portfolio/*` is fine (plugins may
depend on built-ins, not the reverse).

### 4. Minimum hit area for selection

Even with placeholders, thin nodes are fiddly to click. In the editor
canvas only (never in published output), give every `[data-node-id]`
element a `min-height` of ~8px via a canvas-scoped CSS rule in
`components/editor/Canvas.tsx` (e.g. a `<style>` block scoped by a
wrapper class, or a Tailwind arbitrary variant). Published output must
be unaffected — verify by curling `/p/[slug]` and confirming no such
rule is present.

## Non-goals

- No Layers/Navigator panel (separate, larger piece of work).
- No change to `PropertyField` types (the comma-separated `tags`/`items`
  limitation stays for now).
- Don't touch `builder/history/*` or the Style Engine.

## Acceptance criteria

- `npx tsc --noEmit`, `npm run build`, `npm run lint` clean.
- Smoke test (add to `builder/components/smoke.ts` or a new file):
  - `cloneNodeWithNewIds` on a 3-level nested node produces zero shared
    ids with the original (walk both trees, assert the id sets are
    disjoint), and the duplicated document passes
    `validateDocumentStructure`.
  - A document with a `Page` nested inside a `Section` now **fails**
    `validateAgainstRegistry`.
  - A `ProjectCard` with all-empty props renders the placeholder text.
- Manual: Cmd/Ctrl+D duplicates the selected node; the copy appears
  immediately after it and is independently editable (editing the copy
  does not change the original).
