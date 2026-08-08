# ADR-011: Shared Named Styles (Proposed — Not Started)

## Status

Proposed (2026-08-08). **Do not implement until approved.**

## Context

Plan 26 Stage 4. Three visually identical cards are three independent copies
of nine hardcoded declarations. Nothing in the document can say "these are the
same thing", so nothing keeps them aligned — not the author, not the AI, not
a future theme editor.

Stage 3 (ADR-010) must land first: deciding what a shared style *contains*
is impossible while layout intent lives in two places.

## Proposed decision

Add optional `styleRef?: string` on `BuilderNode` pointing to a named entry
in `BuilderDocument.sharedStyles: Record<string, NodeStyleRules>`.

Resolution order at render and in the Inspector:

1. Node-authored `styles[breakpoint]` overrides
2. Referenced shared style set (breakpoint cascade within the set)
3. Component `resolveStyleDefaults`

Shared styles are edited in one place; all referencing nodes update together.

Per-portfolio theme (Plan 24 item 8) falls out naturally: `defaultTokens`
becomes document-level data seeded into `sharedStyles` rather than a global
module constant.

## Scope estimate

| Area | Effort | Notes |
|------|--------|-------|
| Document types + validation | 1–2 days | Additive fields per ADR-008 |
| Renderer / effective resolution | 2–3 days | Extend `resolveNodeStyle` chain |
| Inspector UI (style library panel) | 3–5 days | Create/rename/apply/detach flows |
| Commands (apply shared style, edit set) | 2–3 days | Undo semantics for shared edits |
| AI schema + prompt | 1–2 days | `styleRef` on create; reuse sets |
| Publish / export | 1 day | Inline or preserve refs |
| Migration + tests | 2 days | Idempotent; fixture documents |
| **Total** | **~2–3 weeks** | Assumes Stage 3 stable |

## Out of scope for first slice

- Theme editor UI with live token sliders
- Cross-portfolio style libraries
- CSS-class export of shared styles

## Consequences (if accepted)

- `BuilderNode`, serialization, renderer, Inspector, publish output, and
  AI schema all gain shared-style awareness.
- Style digest (Plan 26 Stage 1) should include shared-style names and
  their most-used values, not just per-node declarations.

## Approval gate

Owner review of this ADR before any `sharedStyles` field is added to the
document model.
