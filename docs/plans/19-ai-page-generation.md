# Plan 19 — AI Page Generation

## Objective

Generate and modify Builder documents from a natural-language prompt.

**This reverses a documented v1 exclusion.** `docs/01-vision-and-product-principles.md`
lists "AI generation" under *Out of Scope (v1)*, and architecture spec
§10 repeats it. The owner has explicitly approved it as v2 work — see
`docs/decisions/ADR-007-v2-scope-expansion.md` (Plan 21). Do not treat
the old exclusion as still binding, but do not delete the v1 record
either.

**Confirmed decision:** talk to models through **Vercel AI Gateway**
using the AI SDK with plain `"provider/model"` strings, so the model can
be changed without code changes.

## Context

Read `builder/CONTRIBUTING.md` first, then ADR-005 and ADR-006 — they
are the binding constraints here and they are unusually specific:

- **ADR-005:** the builder never depends on a specific AI vendor; all AI
  access goes through a provider interface.
- **ADR-006:** *AI produces Builder documents, not HTML.* AI must go
  through the same primitives a human uses. This means **the model's
  output is applied as `Command`s through `EditorSession.execute`** — so
  generation is validated, undoable, and renderable like any other edit.
  Generating HTML/JSX, or hand-writing a document straight into Prisma,
  violates this.

Already implemented (read, do not modify):
- `builder/ai/types.ts` — the contract already exists:
  `AIProvider { name, generate(request): Promise<AIGenerateResult> }`,
  `AIGenerateRequest { prompt, document }`,
  `AIGenerateResult { commands: readonly Command[] }`. Note it already
  returns **commands**, not a document — that is ADR-006 encoded in the
  type. Implement against this; don't redesign it without saying why.
- `builder/history/types.ts` — the closed `Command` union the model must
  produce.
- `builder/registry/types.ts` — `ComponentDefinition.propertySchema` is
  the source of truth for what props each component accepts. The prompt
  must be built from the live registry, not a hardcoded list, or the
  model will invent components that don't exist.
- `builder/document/validate.ts` — `validateAgainstRegistry`.

## Deliverables

### 1. Provider adapter — `builder/ai/gateway-provider.ts`

`createGatewayProvider(config): AIProvider` using the AI SDK's
`generateObject` (structured output) with a `"provider/model"` string
routed through AI Gateway. Model id comes from config/env, never
hardcoded.

New dependencies (`ai`, and whatever the gateway integration requires)
— call them out explicitly in your report. Needs an API key in env;
document the variable name in `.env.example` and **never** commit a
real key.

Use a schema (zod is already a dependency) mirroring the `Command`
union so the model returns structured commands, not prose you have to
parse. If the SDK's structured output can't express the union cleanly,
have the model emit a flat, simpler intermediate shape and translate it
to `Command`s in your own code — do not fall back to parsing free text.

### 2. Prompt construction — `builder/ai/prompt.ts`

Build the system prompt from the live `ComponentRegistry`: for each
registered component, its `type`, `category`, and `propertySchema` keys
and types. Include the current document (serialized) so the model can
reference existing node ids for `UpdateProps`/`MoveNode`.

Keep this a pure function of `(registry, document, userPrompt)` so it's
testable without a network call.

### 3. Application path — `builder/ai/apply.ts`

```ts
export function applyAIResult(
  session: EditorSession,
  result: AIGenerateResult,
): { applied: number; failed: readonly CommandError[] }
```
Applies each command in order via `session.execute`. **Never** bypass
the session. Commands that fail validation are collected and reported,
not silently dropped — a model that produced 8 good commands and 2 bad
ones should apply the 8 and tell the user about the 2.

Because every command goes through the session, a single Cmd+Z per
command already works. Note in your report whether a "undo the whole
generation" grouping is needed (the current `History` is per-command;
grouping would be a `History` change and is **out of scope here** —
flag it, don't build it).

### 4. Server action + UI

A server action taking the prompt and current document JSON, running
the provider, returning the commands (do **not** apply them
server-side — the client session owns the document). Auth-check with
the existing `requireOwnedPortfolio` pattern.

UI: a prompt input in the editor (panel or dialog). On submit: show
pending state, apply the returned commands, toast how many applied and
how many failed.

**Rate limiting / cost:** this endpoint costs money per call and is
user-triggered. Add a basic per-user throttle and a max prompt length.
Say what limits you chose in your report.

### 5. Never trust model output

Model output is untrusted input. It must not be able to produce a
document that fails validation, and command payloads must be checked
for well-formedness (`nodeId`s that exist, `type`s that are registered)
before `session.execute` — `execute` already returns `ok: false` on
failure, so surface that rather than assuming success.

## Non-goals

- No image generation, no copywriting-only mode, no chat history.
- No streaming/partial application — generate, then apply atomically
  from the user's point of view.
- No fine-tuning, no RAG over existing portfolios.
- Don't modify `builder/history/*`, `builder/document/*`, or
  `builder/registry/*`.

## Acceptance criteria

- `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm test` clean.
- Unit tests (no network): `builder/ai/prompt.ts` includes every
  registered component type from a test registry; `applyAIResult`
  applies valid commands and reports invalid ones without throwing.
- The provider adapter is only exercised behind an integration test that
  is **skipped when the API key is absent** — `npm test` must still pass
  with no key and no network (Plan 16's rule).
- Manual: a prompt like "add a contact section with a heading and a
  button linking to mailto:me@example.com" produces nodes on the canvas
  that are individually selectable and undoable.
- Verify ADR-006 compliance explicitly: confirm no code path writes
  HTML or a raw document — everything goes through `Command`s.
