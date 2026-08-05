# ADR-005: AI Providers Are Pluggable

## Status

Accepted

## Decision

The Builder never depends directly on a specific AI model or vendor. All
AI capabilities are accessed through a provider interface.

## Rationale

This allows switching between OpenAI, Anthropic, Gemini, Azure OpenAI,
Ollama, or future providers without changing the builder core.

## Alternatives

-   Hard-code a single AI provider
-   Vendor-specific integrations

## Consequences

-   The builder communicates only with an AI provider abstraction.
-   Providers can be added, removed, or replaced independently.
-   AI features remain portable across deployments.
