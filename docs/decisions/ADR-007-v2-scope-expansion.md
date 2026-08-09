# ADR-007: v2 Scope Expansion (AI Generation, Animation Timeline, Versioning)

## Status

Accepted

## Context

`docs/01-vision-and-product-principles.md` listed the following as
*Out of Scope (v1)*, and `BUILER_V1-ARCHITECTURE_SPECIFICATION.md` §10
repeated them:

- AI generation
- Advanced animation timelines
- Real-time collaboration
- Marketplace / plugin marketplace
- Full CMS
- Custom code injection
- Complex workflow automation

Those exclusions were correct for v1: they kept the engine focused on
composition, and v1 shipped on that basis (see `docs/V1-COMPLETION.md`).

With v1 complete, the owner has explicitly chosen to take on three of
the excluded or unbuilt capabilities.

## Decision

The following move **into scope for v2**:

1. **AI page generation** — previously excluded outright. Constrained by
   the existing ADR-005 (provider abstraction only) and ADR-006 (AI
   emits Builder documents via commands, never HTML). Implemented
   against Vercel AI Gateway using `"provider/model"` strings so the
   model is swappable.
2. **Animation timeline** — previously excluded outright. The owner
   chose a full keyframe timeline over a bounded trigger→effect system,
   with explicit awareness that it is the heavier option.
3. **Versioning** — *not* previously excluded. `docs/02-core-architecture.md`
   already assigned "serialization and versioning" to the Document
   Engine; only serialization was built. This closes a documented gap
   rather than expanding scope. Snapshot on publish, with restore.

The following **remain out of scope**: real-time collaboration,
marketplace, full CMS, custom code injection, complex workflow
automation.

## Rationale

The v1 exclusions existed to protect focus while the engine was being
built, not because these capabilities conflict with the architecture. In
particular, the architecture anticipated AI: ADR-005 and ADR-006 were
written during v1 and `builder/ai/types.ts` has shipped as contracts
since Plan 01, with `AIGenerateResult` deliberately returning
`Command[]` rather than a document. Building AI generation now honours
that design rather than retrofitting it.

Versioning is a prerequisite for the other two: both AI generation and
timeline editing make large, hard-to-review changes to a document, and
restore is what makes them safe to experiment with. It is sequenced
first for that reason.

## Consequences

- The v1 out-of-scope list in `docs/01-vision-and-product-principles.md`
  is retained as a historical record of what v1 meant, with a v2 section
  added alongside it. It is not deleted or rewritten.
- The node contract in `builder/document/types.ts` gains an optional
  `animations` field, and `schemaVersion` moves to `2` for new
  documents. `schemaVersion: 1` documents must continue to load and
  render unchanged — there is real data in the database.

  > **Superseded in part by
  > [ADR-008](./ADR-008-additive-document-evolution.md) (2026-08-08):**
  > the optional `animations` field stands, but `schemaVersion` does
  > **not** move to `2`. ADR-008 establishes that contract changes are
  > additive and optional and that `schemaVersion` is provenance, never
  > branched on — so an optional field needs no version bump and no
  > migration. The requirement that existing documents keep loading
  > unchanged is unaffected, and is in fact what ADR-008 guarantees by
  > construction.
- AI introduces the project's first paid, network-dependent, and
  non-deterministic runtime dependency. Tests must remain runnable with
  no API key and no network.
- The animation timeline is the largest single subsystem in the project
  and is staged (model → playback → UI) with review points between
  stages, rather than landing in one pass.
- Model output is untrusted input. Animation and AI values both reach a
  generated stylesheet, so the existing CSS sanitiser in
  `builder/styles/responsive.ts` becomes security-relevant in two more
  places.

## Alternatives considered

- **Keep the v1 exclusions and stop.** Rejected: the owner wants the
  product to reach parity with comparable visual editors on interaction and
  authoring speed. (WEBFLOW-DEV-REF: remove external product name before release.)
- **Bounded trigger→effect animations instead of a timeline.** Offered
  and explicitly declined in favour of the full timeline.
- **Ship AI before versioning.** Rejected: no restore path while an
  unpredictable generator is rewriting documents.
