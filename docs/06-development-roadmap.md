# Development Roadmap

v1 sign-off: [V1-COMPLETION.md](./V1-COMPLETION.md) (2026-08-08).
**Phases 1–5 implemented. Success criterion 1 is partially met** — the
responsive-published-output half was fixed by Plan 23 (`@media`
declarations now emit `!important` so they beat inline base styles); the
remaining half is that the reference page was authored by
`scripts/seed-dogfood-portfolio.tsx` rather than built through the editor
UI. Criteria 2 and 3 are met. See the sign-off for evidence.

**That remaining half is deliberately deferred, not outstanding work**
(decided 2026-08-08). The primary authoring path is AI generation
(Plan 19), not node-by-node clicking, so "build a responsive webview
visually" as originally written — a human assembling a page by hand —
is no longer the bar the product is aiming at. The editor's role is
**refining generated output**, not authoring from scratch. Criterion 1
should be read as satisfied on the engine and published-output side, with
the authoring claim superseded by the AI path.

Two consequences worth stating plainly:

- **Plan 19 is now on the critical path**, not a v2 extra. It is the
  primary way documents get created, so the product does not really work
  until it does.
- **Plan 18 (versioning) matters more, not less.** Sequencing 18 → 19 was
  already the README's call because restore is the safety net; that
  reasoning gets stronger when a non-deterministic generator is the main
  producer of documents. ADR-009's composite command is the other half —
  one generation must undo in one step.

## Phase 1 --- Foundation ✅

-   Vision
-   Architecture
-   Document Model
-   Component Registry

## Phase 2 --- Rendering ✅

-   React renderer
-   Preview
-   Component rendering

## Phase 3 --- Editor ✅

-   Canvas
-   Selection
-   Drag and drop
-   Property inspector

## Phase 4 --- Editing ✅

-   History
-   Undo/Redo
-   Autosave

## Phase 5 --- Publishing ✅

-   Preview
-   Publish
-   Embed
-   Export

## Success Criteria

-   Build a responsive WhatsApp webview visually. ❌ *Not met — see [V1-COMPLETION.md](./V1-COMPLETION.md)*
-   Publish without writing code. ✅
-   Add a new component without changing the engine. ✅
