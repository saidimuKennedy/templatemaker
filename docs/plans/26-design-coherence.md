# Plan 26 — Design Coherence: Themes, Reuse, and Effective Values

## Objective

Plan 25 made AI output *look designed*. It did not make two generations
look like the same product. Three real defects surfaced the moment the
owner generated a second and third page:

1. **Every page looks different.** Nothing binds one generation to the
   next.
2. **The Design panel is blank** on generated nodes that are visibly laid
   out.
3. **Layout intent is split across two systems** — props and styles —
   which is why (2) happens and why authors can't tell which control wins.

This plan fixes the cause of all three: *there is no shared design record,
and no notion of an effective value.*

## Evidence — read this before proposing anything

Taken from the live document (`Silence Studio`, page `contact us`),
generated after Plan 25 landed:

```
Contact Card - Email  [Container]  styleKeys=9
Contact Card - Phone  [Container]  styleKeys=9
Contact Card - Studio [Container]  styleKeys=9
Contact Banner Overlay [Container] styleKeys=16
Contact Container     [Container]  styleKeys=0
Contact Cards Grid    [Grid]       styleKeys=0
Nav Links Stack       [Stack]      direction:"column"
```

Three visually identical cards are **three independent copies of nine
hardcoded declarations**. Containers that are visibly laid out carry zero
authored styles, because their layout comes from the renderer, not the
document. And the navbar's links are a column because the model said so —
the responsive work in Plan 25 is behaving correctly on a structure that
was authored wrong.

`defaultTokens` (`builder/styles/tokens.ts`) is a module constant, global
and read-only. The prompt shows it to the model; nothing checks that what
comes back came from it. The model copies *values*, never references, so
two pages can both "use the palette" and still disagree on every radius
and tint.

## Context every agent must read first

- `builder/CONTRIBUTING.md` — rule 1 (document is the single source of
  truth) and rule 3 (all edits are commands) both bind Stage 3.
- `AGENTS.md` — **this is not the Next.js you know.**
- `docs/plans/25-ai-visual-fidelity.md` — what already exists.
- `docs/plans/24-surface-engine-capabilities.md` item 8 — design tokens
  are already known to be unreachable; this plan is where that gets fixed.

**Staged. Stop for review after each stage.** Stages 1 and 2 are cheap and
independently valuable. Stages 3 and 4 change the document model and are
where the real cost is.

---

## Stage 1 — Style digest + palette constraint (cheap, do first)

The fastest large win: make generation N+1 *see what generation N chose*.

### 1a. Extract a digest from the live document

New `builder/ai/style-digest.ts`, a pure function of `BuilderDocument`:
walk every node's styles and report what the document actually uses —
most-frequent colours, border radii, spacing values, font sizes and
weights, and the section names that already exist.

Frequency-ranked and truncated. This is a *description of the existing
design*, not a dump: a digest longer than the recipes defeats its own
purpose and eats the token budget Stage 1d of Plan 25 measured.

Pure function, no network, unit-tested against a fixture document.

### 1b. Feed it into every prompt

Wire into `buildAIPrompt` with an explicit instruction to **reuse these
values rather than invent neighbours**. Near-misses are what make pages
look subtly wrong — `#f8fafc` next to `#f9fafb` reads as a mistake in a
way that two clearly different colours does not.

On an empty document the digest is empty; the prompt must fall back to the
token palette cleanly rather than emitting a hollow section.

### 1c. Constrain colour, and measure the drift

Add the palette to the prompt as a closed list for colour-kind fields
(`color`, `backgroundColor`, `borderColor` — see `fields.ts`), with tints
derived from it rather than invented.

**Do not silently rewrite off-palette colours.** Snapping a model's colour
to the nearest token would change a design decision without telling
anyone. Instead log a distinct warning from `normalize-styles.ts` when a
colour-kind value is not in the palette, so drift is *measurable* before
anyone decides to enforce it. Report the off-palette rate across a
three-section generation.

### Stage 1 acceptance

- Four gates clean; `npm test` passes with no key and no network.
- Unit test: digest extracts frequency-ranked values from a fixture; empty
  document yields a clean fallback.
- **Measured:** off-palette colour rate over three consecutive generated
  sections, before and after. If the number doesn't move, say so — that is
  the finding, and it means the constraint needs teeth (Stage 4) rather
  than more prompt text.

---

## Stage 2 — Effective values in the Design panel

The panel reads `node.styles[breakpoint]` and nothing else, so a `Grid`
shows Display "Default" while rendering as a grid. The layout defaults
live in the renderer's inline style and are invisible to the Inspector.

- Show the **effective** value as placeholder text in an unset control —
  visibly distinct from an authored value, so "inherited" never looks like
  "set".
- The source of the effective value is the component's own render-time
  default plus the breakpoint cascade. Read it from the definition; do
  **not** hardcode a second copy of Grid's or Stack's defaults in the
  Inspector — two sources of truth for the same value is the bug this
  stage exists to fix.
- The existing hint ("Blank fields inherit values from smaller
  breakpoints") is now only half the story; it must also say where a
  component default is coming from.

**Out of scope:** editing an effective value in place. Clicking an
inherited control to author it is a separate interaction with its own
undo semantics.

---

## Stage 3 — One system for layout intent

`Stack.direction` is a prop; `flexDirection` is a style. `Grid.columns` is
a prop; `gridTemplateColumns` is a style. `gap` is **both**, and the style
silently wins because `...style` spreads last in the renderers.

This duplication is why authors can't predict which control applies, and
why the AI picks one arbitrarily and leaves the other blank.

Pick one model and write down why:

- **Styles win** — layout props become style defaults seeded at create
  time; Content tab keeps only content. Cleanest end state; needs a
  migration for existing documents.
- **Props win** — layout style fields disappear from the Design panel for
  components that own that concern. Smaller change; keeps two vocabularies
  and will confuse again later.

**Requires an ADR** and a decision on migrating existing documents. Do not
start implementing before that lands.

---

## Stage 4 — Shared styles (the real fix)

Three identical cards are three copies. Nothing in the document can say
"these are the same thing", so nothing can keep them the same — not the
author, not the AI, not a future theme editor.

Needs a reusable style concept in the document model: named style sets a
node references, resolved at render, editable in one place. This is the
foundation a theme editor and a component library both need.

- **Requires an ADR.** It changes `BuilderNode`, serialization, the
  renderer, the Inspector, publish output, and the AI schema.
- Sequencing: **after** Stage 3. Deciding what a shared style *contains*
  is impossible while layout intent lives in two places.
- Per-portfolio theme (Plan 24 item 8) falls out of this naturally —
  tokens stop being a global constant and become document data.

**Do not begin Stage 4 without the ADR approved.** Estimate it, don't
start it.

---

## Non-goals

- No silent rewriting of author or model colour choices.
- No second copy of component defaults in the Inspector.
- No document-model changes in Stages 1–2.
- No theme editor UI until Stage 4's ADR lands.

## Overall acceptance

- Three consecutively generated sections share radii, tints, and spacing —
  judged side by side, and reported honestly if they don't.
- A generated `Grid` shows its effective Display/Columns in the Design
  panel instead of a blank control.
- Off-palette colour rate measured and reported, before and after.
