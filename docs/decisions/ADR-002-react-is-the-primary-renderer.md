# ADR-002: React is the Primary Renderer

## Status

Accepted

## Decision

The first renderer targets React.

## Rationale

The existing stack uses React and Next.js, enabling reuse and rapid
iteration.

## Alternatives

-   Native HTML generation
-   Vue
-   Svelte

## Consequences

Future renderers must consume the same document model.
