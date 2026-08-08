# Plan 17 — v1 Sign-off

## Do this only after Plans 13–16 have landed and been verified

## Objective

Produce `docs/V1-COMPLETION.md`: an evidence-backed statement that v1 is
complete against its own documented criteria. This is a verification
task, not a coding task. **Do not write the document first and check
afterwards** — run each check, record the actual result, and let the
document reflect what you found, including anything that failed.

## Context

v1 is defined by two things in the existing docs, and nothing else:

`docs/06-development-roadmap.md` — phases:
- Phase 1 Foundation: Vision, Architecture, Document Model, Component Registry
- Phase 2 Rendering: React renderer, Preview, Component rendering
- Phase 3 Editor: Canvas, Selection, Drag and drop, Property inspector
- Phase 4 Editing: History, Undo/Redo, Autosave
- Phase 5 Publishing: Preview, Publish, Embed, Export

`docs/06-development-roadmap.md` — success criteria:
1. Build a responsive WhatsApp webview visually.
2. Publish without writing code.
3. Add a new component without changing the engine.

## Deliverables

### `docs/V1-COMPLETION.md`

Structure it as: for each phase item and each success criterion, state
**Met / Not met**, the **evidence** (a command run and its result, a
file path, or a described manual check), and any **caveat**.

Evidence must be real and reproducible. Acceptable: `npm test` output,
a `curl` response, a specific file/line reference, a described
browser interaction with what was observed. Not acceptable: "looks
done", or restating that a plan document exists.

Pay particular attention to the three success criteria, which are the
actual bar and are easy to hand-wave:

1. **"Build a responsive WhatsApp webview visually"** — the load-bearing
   word is *visually*. Prove a page can be built through the editor UI
   by clicking, not by seeding a document with a script. Note honestly
   that the reference "Silence Studio" page currently in the database
   was seeded programmatically by `scripts/seed-dogfood-portfolio.tsx`,
   not built by hand — if you use it as evidence, say so. *Responsive*
   means it adapts at real viewport widths via the `@media` rules from
   `buildResponsiveStylesheet`, verified at both a phone width and a
   desktop width.
2. **"Publish without writing code"** — full path: create → edit →
   save → publish → public URL renders.
3. **"Add a new component without changing the engine"** — the real
   test of ADR-003. Actually do it: write a throwaway component
   definition, register it via `registerComponent`, confirm it appears
   in the Toolbox and renders on the canvas, and confirm you changed
   **zero** files under `builder/document/`, `builder/registry/`,
   `builder/renderer/`, `builder/history/`, or `builder/canvas/`.
   Delete the throwaway afterwards and say so.

### Also record known gaps

A completion doc that lists nothing outstanding is not credible. Include
a "Known limitations carried into v2" section. At minimum, from this
build:
- Editor UI has no automated tests (Plan 16 covers engine only).
- `PropertyField` has no list/array type — `ProjectCard.tags` and
  `SkillGroup.items` are comma-separated strings.
- `createStyledRenderer` duplicates the tree-walk in `renderer.tsx`
  instead of a `resolveProps` hook on `RenderContext`.
- No Layers/Navigator panel; selection depends on clicking rendered
  pixels.
- Style editing exposes a fixed `STYLE_FIELDS` list, not per-component
  style schemas.
- Radix + React 19 hydration required explicit stable trigger ids and
  avoiding `asChild` in `app/(dashboard)/layout.tsx`; the underlying
  `useId` divergence is worked around, not root-caused in React.
- The database used in development is intermittently unreachable from
  some environments; this is infrastructure, not app code, but it makes
  "did it break?" ambiguous — mention it so future readers don't
  misattribute failures.

Add anything Plans 13–16 report as outstanding.

### Update the roadmap

Mark completed phases in `docs/06-development-roadmap.md` and link to
`docs/V1-COMPLETION.md`. Do not delete the phase list — it's the record
of what v1 meant.

## Non-goals

- Do not start any v2 work (Plans 18–20).
- Do not fix newly-found issues in this plan; log them in the doc and
  in your report. If something is severe enough to block sign-off, say
  so plainly and stop rather than signing off anyway.

## Acceptance criteria

- `docs/V1-COMPLETION.md` exists, every phase item and success criterion
  has an explicit Met/Not met plus evidence.
- `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint` all
  run, with actual output recorded in the doc.
- If any item is Not met, the document says so prominently at the top
  rather than burying it.
