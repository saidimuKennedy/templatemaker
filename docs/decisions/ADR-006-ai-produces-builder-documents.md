# ADR-006: AI Produces Builder Documents, Not HTML

## Status

Accepted

## Decision

AI generates or modifies Builder documents through engine actions rather
than producing HTML, CSS, or React directly.

## Rationale

The document model is the system's source of truth. AI should use the
same primitives available to human users.

## Alternatives

-   Generate HTML
-   Generate React components
-   Generate static templates

## Consequences

-   AI becomes another client of the Builder Engine.
-   All AI changes support validation, undo/redo, and rendering.
-   The same document can be published, previewed, or exported using any
    renderer.
