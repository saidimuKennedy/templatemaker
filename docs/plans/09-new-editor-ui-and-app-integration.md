# Plan 09 — New Editor UI & App Integration

## Do this after Plans 07 and 08 land

This plan wires the whole engine (registry, renderer, command engine,
history/session, style engine, inspector, canvas, publish) into the
actual Next.js app, replacing the step-wizard editor. It needs Plan 07's
components and Plan 08's `lib/builder/*` helpers to exist first.

## Objective

Replace `components/editor/EditorClient.tsx` (currently a
react-hook-form-driven wizard: `WizardShell` + `PreviewPane`) with a
canvas-based editor backed by an `EditorSession`, and update every route
that reads/writes `Portfolio.content` to use `BuilderDocument`s instead
of the old `PortfolioData` shape.

## Context

Read `builder/CONTRIBUTING.md` first — rule 3 ("all edits go through
commands") applies directly to how this UI must be built: every click,
keystroke, or button in the new editor must produce a `Command` run
through `EditorSession.execute`, never a direct object mutation of
document state in a `useState`.

Already implemented (read, don't modify unless noted):
- `builder/history/session.ts` — `EditorSession`
  (`getDocument/execute/undo/redo`), `createEditorSession(document)`.
- `builder/renderer/renderer.tsx` — `createRenderer()`. Every rendered
  node's root DOM element carries `data-node-id` (confirmed for
  built-ins in `builder/components/*` and required of Plan 07's
  business components).
- `builder/styles/apply.ts` — `createStyledRenderer(renderer, breakpoint)`
  — wrap the base renderer with this so `props.style` gets resolved;
  use breakpoint `"base"` for the editor canvas (mobile-first per
  ADR-004 — the canvas should default to showing the mobile/WhatsApp
  webview size, not desktop).
- `builder/canvas/*` — `CanvasState`, `select`/`clearSelection`/
  `isSelected`, `beginDrag`/`updateDropTarget`/`resolveDropCommand`/
  `endDrag`, `resolveResizeCommand`, `resolveKeyAction`.
- `builder/inspector/*` — `buildInspectorModel(node, registry)`,
  `createUpdatePropsCommand`, `createUpdateStylesCommand`,
  `validateFieldValue`.
- `builder/publish/*` — `renderPreview`, `publish`, `renderEmbed`,
  `exportDocumentJson`.
- `lib/builder/registry.ts` — `createPortfolioRegistry()` (Plan 08).
- `lib/builder/seed.ts` — `createDefaultDocument(templateId, projectId)`
  (Plan 08).
- `lib/builder/content.ts` — `parseBuilderContent`,
  `validatePortfolioDocument` (Plan 08).
- `lib/auth.ts` — `getSession()`, used by every existing server action
  in this app for auth checks; keep using it exactly as
  `app/(dashboard)/editor/[id]/_actions.ts` does today.
- `lib/slug.ts` — `generateSlug()`, keep reusing for publish.

Files you will replace the contents of (keep the same paths so nothing
else in the app needs to change its imports):
- `components/editor/EditorClient.tsx`
- `app/(dashboard)/editor/[id]/_actions.ts`
- `app/(dashboard)/editor/[id]/page.tsx`
- `app/(dashboard)/_actions.ts` (`createPortfolio` only — leave
  `publishPortfolioFromDashboard`/`unpublishPortfolioFromDashboard`
  as thin re-exports, they already just delegate)
- `app/p/[slug]/page.tsx`

Files you will delete: none — that's Plan 10's job, once this plan is
verified working end-to-end. It's fine (expected) for
`components/editor/steps/*`, `components/editor/WizardShell.tsx`,
`components/editor/PreviewPane.tsx`, and `components/templates/*` to
become unused dead code after this plan lands.

## Deliverables

### Interaction model (scope this deliberately)

Full pixel-level pointer drag-and-drop is **out of scope** for this
plan (see Non-goals) — `resolveDropCommand` exists and you should use
it, but drive it from explicit **Up/Down/Delete** controls per selected
node rather than building pointer-move/drop-zone geometry. This still
exercises the whole Canvas Engine contract (selection, drop resolution,
keyboard shortcuts) without requiring new DOM-measurement code the
roadmap didn't ask this plan to build.

### `components/editor/Canvas.tsx` (new file)

Client component. Props: `initialDocument: BuilderDocument`,
`registry: ComponentRegistry`, `onSessionReady?: (session: EditorSession) => void`
(so a parent can call `session.getDocument()` on save).

- Holds one `EditorSession` in a `useRef` (created once via
  `createEditorSession(initialDocument)`), and a `CanvasState` in
  `useState` (`builder/canvas/types.ts`'s `initialCanvasState`), and a
  `documentVersion` counter in `useState` that you bump after every
  `session.execute`/`undo`/`redo` to force a re-render (the session's
  internal document isn't itself React state, so React won't know to
  re-render without an explicit signal — this is the same pattern
  `EditorSession` was designed around, not a workaround).
- Renders the current page via `createStyledRenderer(createRenderer(),
  "base")` wrapped in a container `<div>` with a single delegated
  `onClick` handler: read `event.target.closest("[data-node-id]")`,
  extract the id, call `select(canvasState, pageId, id)`.
- Selected node gets a visible outline — since you can't inject a class
  onto the rendered component's root element (that's owned by the
  component, not the canvas), overlay it instead: after rendering,
  find the selected element via `document.querySelector('[data-node-id="..."]')`
  in a `useEffect` keyed on the selection + `documentVersion`, and
  position an absolutely-positioned highlight `<div>` over its
  `getBoundingClientRect()`. Keep this simple — a single overlay div
  repositioned on selection change and window resize is enough, don't
  build a full selection-box system.
- Attach `resolveKeyAction` (`builder/canvas/keyboard.ts`) to a
  `keydown` listener on the canvas container: `"undo"` →
  `session.undo()` + bump version, `"redo"` → `session.redo()` + bump
  version, `"delete"` → build a `DeleteNode` command for the selected
  node id and `session.execute(...)`, `"deselect"` → `clearSelection`.
  Skip `"duplicate"` — not worth the extra node-cloning logic for this
  plan; note it as a follow-up in your report if you skip it.
- Render a small floating toolbar near the selection (or a fixed panel
  row) with **Up**/**Down**/**Delete** buttons when something is
  selected:
  - Up/Down: find the selected node's parent + index via
    `findNodeAndParent` (`builder/document/tree.ts`, already exported
    from `builder`'s barrel), build a `DropTarget` at `index - 1` /
    `index + 2` with position `"before"`/`"after"` against the
    appropriate sibling, and run it through
    `resolveDropCommand(session.getDocument(), pageId, selectedId, dropTarget)`
    then `session.execute(command)`. If there's no such sibling
    (already first/last), disable the button.
  - Delete: `session.execute({ type: "DeleteNode", payload: { pageId,
    nodeId: selectedId } })`. Disable if the selected node is the page
    root (deleting it isn't allowed — `applyCreateNode`/`applyDeleteNode`
    in `builder/history/commands.ts` already reject it, but disabling
    the button avoids showing the user an error for a no-op case).

### `components/editor/Inspector.tsx` (new file)

Client component. Props: `document: BuilderDocument`, `pageId: PageId`,
`selectedNodeId: NodeId | null`, `registry: ComponentRegistry`,
`onCommand: (command: Command) => void`.

- If nothing is selected, render a placeholder ("Select a node to edit
  its properties").
- Otherwise, find the node (`findNodeAndParent`), call
  `buildInspectorModel(node, registry)`. If `undefined` (unregistered
  type), show a small warning instead of crashing.
- Render one control per `InspectorField`: `"string"`/`"color"`/
  `"image"` → a text `<input>`; `"richtext"` → a `<textarea>`;
  `"number"` → a number `<input>`; `"boolean"` → a checkbox; `"select"`
  → a `<select>` with `field.options`.
- On change, run `validateFieldValue` (from the node's
  `ComponentDefinition.propertySchema`, matched by `field.key`) — if it
  returns an error string, show it inline and don't fire a command yet;
  otherwise call `onCommand(createUpdatePropsCommand(pageId, node,
  field.key, newValue))`.
- Reuse `@/components/ui/*` (this repo already has `Label`, `Switch`,
  `Select` — from Radix wrappers under `components/ui/`) instead of raw
  HTML elements where a matching primitive exists, for visual
  consistency with the rest of the dashboard.

### `components/editor/Toolbox.tsx` (new file)

Client component. Props: `registry: ComponentRegistry`, `onAdd: (componentType: string) => void`.
List `registry.list()` grouped by `listByCategory` for each
`ComponentCategory`, one small button per component (icon + label from
`ComponentDefinition.icon`/`type`). `onAdd` is intentionally generic —
where the new node actually gets inserted is `Canvas.tsx`'s call: append
it as a child of the currently selected node if one is selected and its
`allowedChildren` constraint permits the type (check via
`registry.get(type)?.constraints`), otherwise append to the page root.
Build the actual `CreateNode` command with a freshly generated id
(`generateNodeId()` from `builder/document/id.ts`) and that component's
`defaultProps`.

### `components/editor/EditorClient.tsx` (rewrite in place)

Replaces the current `WizardShell` + `PreviewPane` split entirely.
Props stay close to today's shape for minimal page.tsx churn:
`portfolioId: string`, `initialDocument: BuilderDocument`, `status:
string`. Internally:
- Build the registry once via `createPortfolioRegistry()` (module-level
  import from `lib/builder`, called inside the component — cheap, no
  memoization needed for v1).
- Lay out `Toolbox` (left), `Canvas` (center), `Inspector` (right) —
  reuse the existing responsive pattern (`components/ui/tabs` for a
  mobile fallback) that `EditorClient.tsx` already uses today, adapted
  to three panes instead of two.
- Wire a **Save** button (and a debounced autosave — 2s after the last
  command, matching the roadmap's Phase 4 "Autosave" item) that calls a
  new server action `saveDocument(portfolioId, exportDocumentJson(session.getDocument()))`.
- Wire **Publish**/**Unpublish** buttons calling the (rewritten)
  `publishPortfolio`/`unpublishPortfolio` actions, same UX as today
  (toast on success/failure via the existing `useToast` hook).

### `app/(dashboard)/editor/[id]/_actions.ts` (rewrite)

- `saveDocument(portfolioId: string, documentJson: string)`: auth-check
  via the existing `requireOwnedPortfolio` pattern, `deserializeDocument`
  (throws `DocumentParseError` on malformed JSON — let that propagate,
  the client shouldn't be sending malformed JSON), then
  `validatePortfolioDocument(document, createPortfolioRegistry())`; if
  invalid, return `{ success: false, errors }` instead of saving (don't
  throw — this is a normal, expected path when a user's edit briefly
  produces something the registry doesn't like, e.g. mid-refactor of a
  node's children). If valid, `prisma.portfolio.update` with `content:
  JSON.parse(documentJson)` (Prisma's `Json` column takes a plain JS
  value, not a string). Revalidate `/p/{slug}` if published, same as
  today.
- `publishPortfolio(portfolioId: string)`: load the portfolio, parse its
  content with `parseBuilderContent`; if that fails (corrupt/legacy
  row), fail the action with a clear error rather than silently
  publishing a default document. Otherwise call `builder/publish`'s
  `publish(document, registry)` — if `ok: false`, return the validation
  errors to the caller instead of publishing. If `ok: true`, generate a
  slug (reuse `generateSlug`, same fallback-name logic as today but
  pull the display name from the `ProfileHeader` node's `name` prop
  instead of `content.profile.name` — you'll need a small helper to
  find the first `ProfileHeader` node in the tree, e.g. a shallow
  `findNodeAndParent`-style walk filtered by `type === "ProfileHeader"`)
  and update `status`/`slug`/`title` same as today.
- `unpublishPortfolio(portfolioId: string)`: unchanged logic, just keep
  it.
- `deletePortfolio(portfolioId: string)`: unchanged, keep as-is.

### `app/(dashboard)/editor/[id]/page.tsx` (rewrite)

- Load the portfolio same as today. Build `registry =
  createPortfolioRegistry()`. Parse content via `parseBuilderContent`;
  if it returns `undefined` (empty/corrupt/legacy-shape row — expected
  for any portfolio created before this migration, since dev data is
  being reset rather than converted), fall back to
  `createDefaultDocument(portfolio.templateId, portfolio.id)` so the
  editor always has something valid to open.
- Pass the resulting `BuilderDocument` to `EditorClient` as
  `initialDocument`.

### `app/(dashboard)/_actions.ts` (`createPortfolio` only)

Replace `defaultPortfolioData()` with
`serializeDocument(createDefaultDocument(templateId, id)) `→ actually
store the **parsed** value (Prisma `Json` wants a JS value): build the
document, then pass it directly as `content` in the `prisma.portfolio.create`
call (no need to stringify/reparse — `BuilderDocument` is already a
plain serializable object; `serializeDocument`/`deserializeDocument` are
for the wire/string boundary, not for handing a value straight to
Prisma).

### `app/p/[slug]/page.tsx` (rewrite)

Replace `TEMPLATE_REGISTRY` lookup with: build `registry =
createPortfolioRegistry()`, `parseBuilderContent(portfolio.content)`
(if `undefined`, treat as `notFound()` — a published portfolio should
never have unparseable content, so this indicates a real bug rather
than an expected case, unlike the editor's fallback above), then
`renderEmbed`-style rendering — actually use `builder/publish`'s
`renderPreview`-equivalent for the public target: call
`createRenderer().renderDocument(document, { registry, target:
"published-webview" })` directly (or add a one-line
`renderPublished(document, registry)` helper to `lib/builder/content.ts`
if you'd rather not import `builder/renderer` directly from a page —
your call, keep it simple). Update `generateMetadata` to pull
name/bio-equivalent from the `ProfileHeader` node instead of
`data.profile.name`/`data.profile.bio`.

## Non-goals

- No real pointer-based drag-and-drop (no `dragstart`/`dragover`/`drop`
  DOM event wiring, no bounding-box math for drop-zone detection) — the
  Up/Down/Delete button model above is the full v1 interaction surface.
  Note this as the clear next increment in your final report.
- No node duplication ("duplicate" keyboard shortcut resolves but you
  don't have to implement the actual clone-and-insert behavior — wiring
  it to a no-op with a `// TODO` is acceptable, just say so in your
  report).
- No changes to `builder/*` — if the engine seems to be missing
  something mid-implementation, report it rather than patching engine
  files from inside this app-integration plan.
- Don't touch or delete `components/editor/steps/*`,
  `components/editor/WizardShell.tsx`, `components/editor/PreviewPane.tsx`,
  or `components/templates/*` — leave them in place as dead code for
  Plan 10 to remove after this plan is verified.
- No responsive-breakpoint switcher UI (base/sm/md/lg toggle) for the
  canvas — render at `"base"` only; that's a nice-to-have follow-up, not
  this plan.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- `npm run build` succeeds (this exercises Next.js's route/type
  generation across every file you touched, not just standalone `tsc`).
- Manual verification (start the dev server, per this session's `run`
  skill if available, otherwise `npm run dev`): create a new portfolio,
  confirm the editor loads with the seeded `ProfileHeader`/empty
  project & skill stacks/`LinksList`, click a node and confirm the
  Inspector shows and edits its fields live, add a `ProjectCard` via
  the Toolbox and confirm it appears, reorder it with Up/Down, delete
  it, hit Cmd/Ctrl+Z and confirm it comes back, Save, reload the page,
  and confirm the edits persisted. Publish and confirm `/p/{slug}`
  renders the published document.
