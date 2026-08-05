# ADR-003: Plugin-Based Components

## Status

Accepted

## Decision

Components are registered through a registry rather than hardcoded into
the editor.

## Rationale

The core editor remains stable while new components are added
independently.

## Alternatives

-   Switch statements
-   Static imports

## Consequences

Every component must expose metadata, schemas, and a renderer.
