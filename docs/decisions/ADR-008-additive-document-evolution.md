# ADR-008: Document Contract Evolves Additively; schemaVersion Is Provenance

## Status

Accepted (2026-08-08)

## Decision

Two rules, together:

1. **Changes to the document contract must be additive and optional.**
   New fields on `BuilderNode`, `BuilderPage`, or `BuilderProject` are
   optional and fall back to a default when absent. Fields are not
   removed, renamed, or given new meaning.

2. **`BuilderDocumentMeta.schemaVersion` is provenance, not control
   flow.** It records which version authored a document. No code branches
   on it, and additive changes do **not** bump it. It changes only if rule
   1 is ever deliberately broken — which then requires a migration and its
   own ADR.

## Rationale

`schemaVersion` was already provenance in practice. Before this ADR
nothing read it: it was written as a literal `1` by seeds and tests,
copied into publish records (`builder/publish/publish.ts:34`,
`embed.ts:35`), and never consulted. There is no migration machinery and
`validateDocumentStructure` does not check it.

The precedent was also already set. Plan 21 added `name?: string` to
`BuilderNode` — a node-contract change — without bumping `schemaVersion`,
because the field is optional and falls back to `node.type`. Nothing
broke, and no migration was needed.

Rule 1 makes migrations unnecessary by construction, which matters
specifically because of ADR-001: the document is the single source of
truth and it is **live published content**. A migration that is wrong
corrupts real user portfolios, and the moment you most want migration
machinery — mid-plan, under deadline, first breaking change — is the
worst moment to be designing it.

It also removes a coordination cost between plans. Plan 20 (animations)
and Plan 24 Stage 4 (project design tokens) both add optional fields.
Under a bump-on-every-change rule they would contend for "version 2" and
whichever landed second would have to rebase. Under this ADR they are
independent and can land in any order.

## Alternatives

- **Load-bearing versioning with migrations.** Add an upgrade step to
  `deserializeDocument` and bump on every contract change. Rejected: it
  buys safety for a breaking change that rule 1 says should not happen,
  at the cost of a migration registry, a test per version, and strict
  landing-order discipline between plans.
- **Remove `schemaVersion` entirely.** Honest about it being unread, but
  discards the published-record provenance trail and the hook we would
  need the first time rule 1 is broken.
- **Decide when it comes up.** Rejected for the reason above: the first
  breaking change would arrive with live portfolios in the database and
  no path forward.

## Consequences

- Every plan touching the document contract adds optional fields with
  documented fallbacks. Plan 20's `animations?`, Plan 24's project
  tokens, and Plan 21's `name?` all already comply.
- **Plan 20's instruction to bump `schemaVersion` to `2` is superseded**
  by this ADR.
- Modelling mistakes cannot be corrected by rewriting the shape. They are
  corrected by adding a better field and leaving the old one readable —
  so field design deserves care up front, and a plan that wants a
  breaking change must argue for it in a new ADR rather than doing it
  inline.
- `schemaVersion` stays on `BuilderDocumentMeta` and in
  `PublishRecord`, unread, as provenance.

Related: [ADR-001](./ADR-001-document-is-source-of-truth.md).
