# ADR-001: Document is the Source of Truth

## Status

Accepted

## Decision

The builder stores every editable page as a serializable document. All
editor operations modify this document.

## Rationale

A single source of truth simplifies rendering, persistence, undo/redo,
and publishing.

## Alternatives

-   Direct DOM editing
-   Component-local state

## Consequences

All mutations must pass through the engine and update the document.
