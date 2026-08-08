# Builder Engine — Parallel Work Plans

This directory splits the remaining engine build (see
`docs/06-development-roadmap.md`) into self-contained plans that
different agents can execute concurrently. **All agents work directly in
this same working tree — no isolated worktrees or branches.** The plans
are split by directory specifically so concurrent edits don't collide;
do not `git worktree` per plan.

Every agent must read `builder/CONTRIBUTING.md` before writing code. It
is short and non-negotiable.

## Current state (already implemented — do not redo)

```
builder/
├── CONTRIBUTING.md                  done
├── index.ts                         done (top-level barrel, may need small updates)
├── document/
│   ├── types.ts                     done — BuilderNode, BuilderPage, BuilderProject,
│   │                                        BuilderDocument, NodeId, PageId, NodeProps,
│   │                                        NodeStyles, ValidationResult, ValidationError
│   ├── tree.ts                      done — findNodeAndParent, removeNode, insertNode, updateNode
│   ├── id.ts                        done — generateNodeId, generatePageId (nanoid)
│   ├── validate.ts                  done — validateDocumentStructure, validateAgainstRegistry
│   ├── serialize.ts                 done — serializeDocument, deserializeDocument, DocumentParseError
│   └── index.ts                     done (barrel)
├── registry/
│   ├── types.ts                     done — ComponentDefinition, ComponentRegistry, PropertySchema,
│   │                                        PropertyField, NodeConstraints, ComponentCategory,
│   │                                        ComponentRenderer
│   ├── registry.ts                  done — createComponentRegistry()
│   └── index.ts                     done (barrel)
├── renderer/
│   ├── types.ts                     done — Renderer, RenderContext, RenderTarget
│   ├── renderer.tsx                 done — createRenderer()
│   └── index.ts                     done (barrel)
├── history/
│   ├── types.ts                     done — Command (CreateNode/MoveNode/DeleteNode/
│   │                                        UpdateProps/UpdateStyles), CommandEngine, History
│   ├── commands.ts                  done — createCommandEngine() (apply + invert)
│   ├── history.ts                   done — BuilderHistory, createHistory()
│   ├── session.ts                   done — EditorSession, createEditorSession()
│   └── index.ts                     done (barrel)
├── plugins/
│   ├── types.ts                     done — Plugin, PluginContext
│   ├── index.ts                     done (barrel)
│   └── portfolio/                   done — see Plan 07 (ProfileHeader/ProjectCard/SkillGroup/LinksList)
├── ai/
│   ├── types.ts                     done — AIProvider, AIGenerateRequest, AIGenerateResult
│   └── index.ts                     done (barrel; no implementation — AI generation is out of v1 scope)
├── components/                      done — see Plan 02 (Page/Section/Container/Stack/Heading/Text/Image/Button)
├── styles/                          done — see Plan 03
├── inspector/                       done — see Plan 04
├── publish/                         done — see Plan 05
└── canvas/                          done — see Plan 06
```

Plans 01–10 are all implemented and verified (typechecked, smoke-tested,
and — for 09/10 — `npm run build`/`npm run lint` checked). The engine
covers Document Model → Registry → Renderer → Command API/History →
Style Engine → Inspector → Publish → Canvas, matching
`docs/06-development-roadmap.md`'s full build order, and it has fully
replaced the old step-wizard editor in the app (Plans 07–10). See
`lib/builder/*` for the app-level registry/seed/content glue, and
`components/editor/{Canvas,Inspector,Toolbox,EditorClient}.tsx` for the
editor UI.

Known gaps carried forward into Plans 11–12 below: the Inspector never
wires up style editing (props only), and the built-in components in
`builder/components/*` don't apply `props.style` at all (only the
Plan 07 portfolio components do) — see Plan 11. Layout is also limited
to `Stack`'s bare flex (no `justify`/`align`, no `Grid`, no
`Navbar`/`Footer`) — see Plan 12.

## Plans 07–10: replacing the existing wizard editor

This repo already has a working step-wizard portfolio editor
(`components/editor/steps/*`, `components/editor/WizardShell.tsx`,
`components/editor/PreviewPane.tsx`, two fixed templates in
`components/templates/*`, all driven by a fixed `PortfolioData` shape in
`lib/schema.ts`). Plans 07–10 replace that with the `builder/` engine
end to end: new "Business" components, a document-based content model,
a canvas-based editor UI, and finally deletion of the old code. This is
a real product cutover (it changes what gets saved to `Portfolio.content`
and what renders on published pages), not just internal engine work —
treat file deletions and schema-adjacent decisions with the care the
top-level agent instructions already call for.

Confirmed decisions this tier is built against (do not re-litigate):
- **No production data migration needed** — `Portfolio.content` today
  has no real user data in the old shape, so Plans 08/09 reset the
  content shape outright rather than writing an old→new converter.
- **New Business components, not generic-only composition** — Plan 07
  builds `ProfileHeader`/`ProjectCard`/`SkillGroup`/`LinksList` as real
  `builder/plugins/portfolio/*` components mirroring the wizard's actual
  fields, rather than approximating them with only the generic
  Layout/Content primitives from Plan 02.

Repo context: Next.js 16 / React 19 / TypeScript strict app at the repo
root. `nanoid` and `zod` are already dependencies — reuse them, don't add
new state/tree/schema libraries. No test runner (vitest/jest) is
configured; verify work with `npx tsc --noEmit -p tsconfig.json` from
the repo root plus a small ad-hoc smoke script if useful (see each
plan's Acceptance Criteria).

## Plans and dependency order

| # | Plan | Directory | Depends on | Can run in parallel with |
|---|------|-----------|------------|---------------------------|
| 01 | [Finish Engine Core](./01-finish-engine-core.md) | `builder/history/`, `builder/plugins/`, `builder/ai/`, `builder/index.ts` | nothing (do first) | — |
| 02 | [Built-in Components](./02-built-in-components.md) | `builder/components/` | 01 (or just `registry`/`renderer`, already done) | 03, 04, 05 |
| 03 | [Style Engine](./03-style-engine.md) | `builder/styles/` | 01 | 02, 04, 05 |
| 04 | [Inspector / Property Engine](./04-inspector-property-engine.md) | `builder/inspector/` | 01 | 02, 03, 05 |
| 05 | [Publish Engine](./05-publish-engine.md) | `builder/publish/` | 01 | 02, 03, 04 |
| 06 | [Canvas Engine](./06-canvas-engine.md) | `builder/canvas/` | 01, 02, 03 | do last, after those land |
| 07 | [Portfolio Business Components](./07-portfolio-business-components.md) | `builder/plugins/portfolio/` | 02 (already done) | 08 |
| 08 | [Document Adapter & Seed Templates](./08-document-adapter-and-seed-templates.md) | `lib/builder/` | 02, 04 (already done) | 07 (pinned to its contract — see plan) |
| 09 | [New Editor UI & App Integration](./09-new-editor-ui-and-app-integration.md) | `components/editor/*`, `app/(dashboard)/editor/*`, `app/(dashboard)/_actions.ts`, `app/p/[slug]/*` | 07, 08 | — |
| 10 | [Cleanup: Remove the Wizard](./10-cleanup-remove-wizard.md) | deletes `components/editor/steps/*`, `WizardShell.tsx`, `PreviewPane.tsx`, `components/templates/*`, `lib/schema.ts`, `lib/validations.ts` | 09 (verified working) | do last |
| 11 | [Style Editing UI](./11-style-editing-ui.md) | `builder/components/*` (fix), `builder/styles/fields.ts`, `components/editor/{StyleInspector,Inspector}.tsx` | 03, 04, 09 (already done) | 12 |
| 12 | [Layout Primitives](./12-layout-primitives.md) | `builder/components/{stack,grid,navbar,footer,index}` | 02 (already done) | 11 |

### Closing v1 (Plans 13–17)

| # | Plan | Directory | Depends on | Can run in parallel with |
|---|------|-----------|------------|---------------------------|
| 13 | [Pointer Drag-and-Drop](./13-pointer-drag-and-drop.md) | `components/editor/Canvas.tsx` | 06 (done) | 14 (item 1 excepted), 15, 16 |
| 14 | [v1 Correctness Pass](./14-v1-correctness-pass.md) | `builder/components/*`, `builder/plugins/portfolio/*`, `builder/canvas/duplicate.ts`, `builder/registry/types.ts` | — | 13, 15, 16 |
| 15 | [Publish Surfacing](./15-publish-surfacing.md) | `app/embed/[slug]/`, `components/editor/EditorClient.tsx` | 05 (done) | 13, 14, 16 |
| 16 | [Test Harness](./16-test-harness.md) | `vitest.config.ts`, all `*/smoke.ts` → `*.test.ts`, `scripts/` | — | 13, 14, 15 (touches `package.json`) |
| 17 | [v1 Sign-off](./17-v1-signoff.md) | `docs/V1-COMPLETION.md`, `docs/06-development-roadmap.md` | 13, 14, 15, 16 **verified** | **Done** — see [V1-COMPLETION.md](../V1-COMPLETION.md). The sign-off is complete; its verdict is that phases 1–5 are implemented but the product bar is not fully met |

Plans 13–16 are largely disjoint by directory and can run concurrently.
Two coordination notes: Plan 14's item 1 (duplication) edits
`Canvas.tsx`, which Plan 13 owns — land it after 13; and Plan 16 edits
`package.json`, so avoid landing it at the same moment as another plan
that adds a dependency. Plan 17 is verification only and must not start
until the other four are actually verified, not merely written.

### v2 (Plans 18–20) — see ADR-007

These follow `docs/decisions/ADR-007-v2-scope-expansion.md`, which moved
AI generation and animation timelines from "out of scope (v1)" into v2
scope. Versioning was never out of scope — it closes a Document Engine
responsibility documented in `docs/02-core-architecture.md` but never
built.

| # | Plan | Directory | Depends on | Notes |
|---|------|-----------|------------|-------|
| 18 | [Versioning](./18-versioning.md) | `prisma/schema.prisma`, `lib/builder/versions.ts`, editor actions + UI | v1 complete (17) | Do first — restore is what makes 19 and 20 safe to experiment with |
| 19 | [AI Page Generation](./19-ai-page-generation.md) | `builder/ai/*`, server action, editor UI | 18 | Bound by ADR-005 + ADR-006: commands only, never HTML |
| 20 | [Interactions & Animation Timeline](./20-interactions-and-animation-timeline.md) | `builder/document/types.ts`, `builder/history/*`, `builder/animations/*`, `components/editor/AnimationPanel.tsx` | 18 | Largest plan. **Staged** — stop for review after each of its 3 stages |

Sequence 18 → 19 → 20 rather than in parallel: 18 is the safety net for
the other two, and 20 changes the node contract and `schemaVersion`,
which 19's prompt construction reads.

### Editor shell (Plans 21–22) — inserted ahead of v2

| # | Plan | Directory | Depends on | Notes |
|---|------|-----------|------------|-------|
| 21 | [Webflow Editor Alignment](./21-webflow-editor-alignment.md) | `scripts/seed-dogfood-portfolio.tsx`, `components/editor/{Navigator,StyleInspector,EditorClient,Toolbox}.tsx`, `builder/styles/fields.ts`, `builder/document/types.ts` | v1 (13–16) | **Landed.** Navigator panel, grouped Style panel, Toolbox popover |
| 22 | Editor shell: resizable panels, context menu, scrollbars | `components/editor/{EditorClient,Canvas,Navigator,NodeActionsMenu}.tsx`, `components/ui/context-menu.tsx`, `app/globals.css` | 21 | **Landed.** Adds `@radix-ui/react-context-menu`. Brief lived in chat, not a plan file |

Plan 21 was inserted after v1 and before the v2 sequence: the editor's
shell was `[Toolbox | Canvas | Inspector]` with no way to see or select
the document tree except by clicking canvas boxes, which does not scale
past a shallow page. It brings the editor to Webflow's
`[Navigator | Canvas | Style]` shape.

Three decisions from Plan 21 bind later work — read its "Confirmed
decisions" section before touching styles or the editor shell:

- **Styles stay inline CSS + generated `@media` rules, never Tailwind
  classes.** Tailwind emits CSS by scanning source files at build time,
  so class names assembled at runtime from database JSON are never
  emitted and published pages would render unstyled. Tailwind is only
  ever appropriate as a code-*export* target.
- **`BuilderNode` gained an optional `name?: string`** — a
  presentational Navigator label, never rendered into published output.
  Optional, so pre-existing documents stay valid and fall back to
  `type`.
- **Spacing style fields are longhand-only** (`paddingTop`, …). A
  declaration is a flat insertion-ordered bag, so a `padding` shorthand
  written after a longhand silently clobbers it. `expandSpacingShorthand()`
  in `builder/styles/fields.ts` migrates legacy shorthands on edit.

Plan 22 continued the same shell work: side panels are drag-resizable
with widths persisted to `localStorage`, the old `Selected node` action
bar was replaced by a right-click context menu shared between the
Navigator and the canvas (`components/editor/NodeActionsMenu.tsx` — one
item set, deliberately not duplicated per surface), and editor
scrollbars are themed.

Two things from 21/22 that later work must not undo:

- **The `ResizeObserver` in `Canvas.tsx`.** The canvas column is sized by
  the editor's CSS grid, so resizing a panel or toggling the
  Mobile/Desktop viewport changes the canvas width *without* firing a
  window resize. A `window.resize` listener alone leaves the blue
  selection outline stranded at stale coordinates, visibly detached from
  its node. The observer is what fixes that.
- **Node renaming goes through the `RenameNode` command** added in the
  Plan 21 follow-up (`builder/history/{types,commands}.ts`,
  `createRenameNodeCommand` in `builder/inspector/edit.ts`). Its inverse
  restores `undefined` rather than `""`, so undoing a rename on a
  previously-unnamed node correctly falls back to showing the component
  type.

Known follow-up not yet built: Navigator drag-to-reorder. Plan 22's
eleven visual acceptance checks also remain unconfirmed.

### Correctness and coverage (Plans 23–24)

| # | Plan | Directory | Depends on | Notes |
|---|------|-----------|------------|-------|
| 23 | Published breakpoint overrides never apply | `builder/styles/responsive.ts` | 17 | Fix found by the v1 sign-off. Brief lived in chat, not a plan file |
| 24 | [Surface Engine Capabilities](./24-surface-engine-capabilities.md) | `components/editor/*`, `builder/history/{session,types,commands}.ts` | 23 (Stage 1 verification) | **Staged — stop for review after each stage** |

Plan 23 fixes a bug the Plan 17 sign-off found by measuring computed
styles in a browser: published pages emit base styles inline and sm/md/lg
as `@media` rules, and inline styles outrank selector-based rules in the
cascade, so **no breakpoint override ever applied** to a property that
also had a base value. The fix marks the generated `@media` declarations
`!important` rather than moving base styles into the stylesheet — because
components inline their own styles too (`Section`'s `padding` prop, for
one), and moving user base styles out of inline would let component
defaults start beating explicit user choices.

Plan 24 audits what the engine supports that no user can reach — multi-page
documents, multi-select, the `sm`/`md` breakpoints, node resize,
`color`/`image` property controls, undo/redo affordances, and design
tokens — and stages the work to surface it.

Three of its stages need real engine additions, so "the engine already
supports this" does not hold universally there:

- `canUndo`/`canRedo` on `EditorSession` (Stage 1b) — present on the
  `History` interface, never surfaced, so undo/redo buttons cannot be
  correctly disabled without it.
- **A composite command (Stage 2a), which Plan 19 also needs.** Commands
  are single-node, so any batch is N undo steps. AI generation emits many
  commands per run — without a composite, "undo what the AI did" means
  pressing Ctrl+Z dozens of times. Built once in Plan 24 and recorded as
  ADR-009 so Plan 19 inherits the decision rather than re-making it.
- Page-level commands (Stage 3b) — the `Command` union is entirely
  node-scoped today.

Stage 3 is also gated on making publishing page-aware **first** (Stage
3a): `renderDocument` concatenates every page into one output, so a second
page would silently append itself to the published site. Editor and
publishing must land together there.

Plans 07 and 08 can run in parallel: Plan 08's seed documents only
reference Plan 07's component `type` strings and prop keys as literals
(both plans pin the exact same contract — see each doc's "Contract other
plans depend on" section), they don't need Plan 07's files to physically
exist yet. Plan 09 needs both finished since it imports real code from
each. Plan 10 is destructive (file deletion) and must not start until
Plan 09 is manually verified working — see that plan's acceptance
criteria.

Plan 01 is small (finishing History + barrels) and should land first so
`builder/index.ts` exports cleanly — but plans 02–05 only actually need
the *already-done* `document/`, `registry/`, and `renderer/` modules, so
they can start immediately in parallel with 01 if you want maximum
throughput; just don't touch `builder/history/`, `builder/plugins/`, or
`builder/ai/`. Plan 06 (Canvas) is the one true "do last" — it is the
one place the roadmap explicitly warns against starting early, and it
needs 02 and 03 (components + styles) to have something real to select
and drag. (Plans 01–10 are all done now — this paragraph is historical
context for how they were sequenced, kept for anyone reading this file
top to bottom.)

Plans 11 and 12 both stem from the same review: the engine can
technically store/resolve arbitrary per-node styles, but (a) no UI ever
lets a user set them, and (b) most built-in components don't even apply
resolved styles to their rendered output, and (c) layout primitives are
too bare to reproduce common patterns (a navbar with space-between, a
CSS grid). Plan 11 fixes (a) and (b); Plan 12 fixes (c). They touch
disjoint files (`components/editor/*` + a small `builder/components/*`
style-prop fix vs. new/modified `builder/components/*` files) and can
run in parallel — but if both land in the same pass, apply Plan 11's
"every component must render `props.style`" fix consistently to Plan
12's new `Grid`/`Navbar`/`Footer` components too, not just the original
8. Neither depends on the other's actual output.

## Rules that apply to every plan

1. Follow `builder/CONTRIBUTING.md` — commands only, no direct document
   mutation, renderer stays read-only, no business-specific components
   inside `builder/` core.
2. Touch only the files/directories your plan lists. If you find a bug
   in a file owned by another plan, note it in your final report instead
   of fixing it — avoids collisions on a shared tree.
3. Out of scope for all of v1 (per `docs/01-vision-and-product-principles.md`):
   real-time collaboration, AI generation UI, a plugin marketplace, a
   full CMS, animation timelines. Don't build toward these.
4. No new runtime dependencies without calling it out explicitly in your
   final report — prefer what's already in `package.json`.
5. Verify with `npx tsc --noEmit -p tsconfig.json` from the repo root
   before reporting done. Fix every new error your change introduces.
