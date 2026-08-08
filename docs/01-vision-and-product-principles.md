# Vision & Product Principles

## Vision

Builder is a visual application composition engine for creating
responsive, production-ready web experiences without writing code.

The primary target is mobile-first webviews embedded in platforms such
as WhatsApp. The same engine must also support landing pages, event
pages, customer portals, surveys, dashboards, and CRM interfaces.

## Product Principles

1.  **Engine First** -- The editor understands composition, not business
    domains.
2.  **JSON is the Source of Truth** -- Every page is represented by a
    serializable document.
3.  **Everything is a Node** -- All elements follow a common node
    contract.
4.  **Renderer Agnostic** -- Multiple renderers consume the same
    document.
5.  **Plugin Driven** -- New components are added without modifying the
    core editor.

## Goals

-   Mobile-first
-   Responsive by default
-   Extensible architecture
-   Fast rendering
-   Production-ready output

## Out of Scope (v1)

Retained as the historical record of what v1 meant. Some of these moved
into v2 — see below and `docs/decisions/ADR-007-v2-scope-expansion.md`.

-   Real-time collaboration
-   AI generation
-   Marketplace
-   Full CMS
-   Advanced animation timelines

## In Scope (v2)

Added by ADR-007 after v1 completion (`docs/V1-COMPLETION.md`):

-   **Versioning** — snapshot on publish with restore. Closes a gap
    already assigned to the Document Engine in
    `docs/02-core-architecture.md`, rather than an expansion.
-   **AI page generation** — via the ADR-005 provider abstraction,
    emitting Builder commands per ADR-006. Never HTML.
-   **Animation timeline** — keyframe-based, with triggers.

## Still Out of Scope (v2)

-   Real-time collaboration
-   Marketplace / plugin marketplace
-   Full CMS
-   Custom code injection
-   Complex workflow automation
