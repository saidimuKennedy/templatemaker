# ADR-009: Composite Commands Occupy One History Slot

## Status

Accepted (2026-08-08)

## Decision

Add a `Composite` command that applies an ordered list of child commands
as a single atomic unit in History:

1. **One undo step.** A composite occupies exactly one slot on the undo
   stack regardless of how many child commands it contains.
2. **Reverse-order inversion.** The inverse of a composite is itself a
   composite whose children are the per-command inverses, in reverse
   application order.
3. **Rollback on partial failure.** If any child command throws during
   apply, every successfully applied child is undone before the error
   propagates — the document is never left half-mutated.

## Rationale

The Command API is single-node (and, after Plan 24 Stage 3, single-page).
Any user-facing batch — deleting five selected nodes, an AI generation
run that emits dozens of `CreateNode` commands — would otherwise produce
N undo steps. One Ctrl+Z would restore one node while four remain
deleted, which reads as broken undo.

Plan 19 (AI Page Generation) and Plan 20 (animation timelines) have the
same shape: many commands per user intent. Building the composite once
here gives them a shared primitive rather than re-deciding under deadline.

## Consequences

- Callers that need atomic batches wrap sub-commands in
  `{ type: "Composite", payload: { commands: [...] } }` or
  `createCompositeCommand([...])`.
- `CommandEngine.invert` must walk child commands against the
  pre-apply document state in forward order to compute each inverse,
  then reverse the list for the returned composite inverse.
- Empty composites are rejected at the call site; a single child is
  passed through unwrapped to avoid pointless nesting.

## Alternatives

- **Disable batch operations in the UI.** Rejected: multi-select delete
  is basic editor hygiene, and AI generation without atomic undo is
  unusable.
- **Merge History entries after the fact.** Rejected: the stack would
  still replay intermediate states on redo and would not help callers
  that need apply-time atomicity.
