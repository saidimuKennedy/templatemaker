# Plan 05 — Publish Engine

## Objective

Implement the Publish Engine described in `docs/02-core-architecture.md`
and section 4/8 of `docs/BUILER_V1-ARCHITECTURE_SPECIFICATION.md`:
turning a validated `BuilderDocument` into preview/publish/export
output. V1 rendering targets are Editor Preview, Published Webview, and
Embedded CRM View (`RenderTarget` already models these three) —
Static/Next.js/Email/PDF exports are explicitly future, not this plan.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, don't modify):
- `builder/document/serialize.ts` — `serializeDocument`,
  `deserializeDocument`, `DocumentParseError`.
- `builder/document/validate.ts` — `validateDocumentStructure`,
  `validateAgainstRegistry`.
- `builder/renderer/types.ts` / `renderer.tsx` — `Renderer`,
  `RenderContext`, `RenderTarget` (`"editor-preview" |
  "published-webview" | "embedded-crm"`), `createRenderer()`.
- `builder/registry/types.ts` — `ComponentRegistry`.

This plan is a thin orchestration layer over those three, plus a
publish-status/versioning concept the roadmap calls for but nothing
else has built yet.

## Deliverables

Directory: `builder/publish/`.

### `builder/publish/types.ts`

```ts
export type PublishStatus = "draft" | "published" | "archived";

export interface PublishRecord {
  readonly projectId: string;
  readonly status: PublishStatus;
  readonly publishedAt: string | null;
  /** Schema/document version this record was published from — from BuilderDocumentMeta.schemaVersion. */
  readonly schemaVersion: number;
}

export interface PublishResult {
  readonly ok: true;
  readonly record: PublishRecord;
  readonly output: ReactElement;   // rendered published-webview output
}

export interface PublishError {
  readonly ok: false;
  readonly errors: readonly ValidationError[];
}

export type PublishOutcome = PublishResult | PublishError;
```

### `builder/publish/preview.ts`

```ts
export function renderPreview(
  document: BuilderDocument,
  registry: ComponentRegistry,
  renderer: Renderer = createRenderer(),
): ReactElement
```
Renders with `target: "editor-preview"`. This function does **not**
validate against the registry first — preview is meant to surface
"Unknown component type" errors live while authoring, so let
`renderer.renderDocument` throw naturally (the Renderer already throws a
clear message per `renderer.tsx`); don't swallow or wrap that error
here, callers (the eventual editor) decide how to surface it.

### `builder/publish/publish.ts`

```ts
export function publish(
  document: BuilderDocument,
  registry: ComponentRegistry,
  renderer: Renderer = createRenderer(),
): PublishOutcome
```
Unlike preview, publishing must be safe to ship — so run both
`validateDocumentStructure(document)` and
`validateAgainstRegistry(document, registry)` first; if either fails,
return `{ ok: false, errors: [...both sets of errors...] }` without
attempting to render. If both pass, render with `target:
"published-webview"` and return `{ ok: true, record: {...}, output }`
where `record.status = "published"`, `record.publishedAt = new
Date().toISOString()`, `record.schemaVersion =
document.meta.schemaVersion`.

### `builder/publish/embed.ts`

```ts
export function renderEmbed(
  document: BuilderDocument,
  registry: ComponentRegistry,
  renderer: Renderer = createRenderer(),
): PublishOutcome
```
Same validation gate as `publish`, but renders with `target:
"embedded-crm"` and does not produce/require a `PublishRecord` update —
returns `{ ok: true, record, output }` too for a consistent shape, but
callers should treat an embed render as informational, not a publish
event (`record.status` here should be `"draft"` unless the underlying
document is already published — accept an optional `currentStatus:
PublishStatus = "draft"` param and pass it straight through instead of
guessing).

### `builder/publish/export.ts`

Keep this one deliberately minimal per the roadmap's "V1 will not
include... complex... Full CMS" and the fact that only Editor
Preview/Published Webview/Embedded CRM are in-scope render targets for
v1: just export a serialization helper —
```ts
export function exportDocumentJson(document: BuilderDocument): string
```
that calls `serializeDocument` and returns the string, as the one "export"
capability v1 actually needs (a downloadable JSON snapshot). Do not
build static HTML export, Next.js export, or PDF/email export scaffolding
— those are explicitly future targets per section 8 of the architecture
spec, not v1.

### `builder/publish/index.ts`

Barrel exporting all of the above.

## Non-goals

- No actual HTTP/deploy/hosting logic (this repo's Next.js app layer,
  not the engine, will eventually call these functions from a route
  handler or server action) — this plan produces pure functions only.
- No static/Next.js/email/PDF export implementations.
- Don't modify `builder/renderer/*`, `builder/registry/*`, or
  `builder/document/*`.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: a document with a node whose `type` isn't registered
  fails `publish()` with a non-empty `errors` array and `ok: false`,
  and does not throw.
- Smoke check: the same document, once the missing component type is
  registered (or swapped for a registered one), succeeds through
  `publish()` with `ok: true` and a `record.status === "published"`.
- Smoke check: `renderPreview` on a document referencing an unregistered
  component type throws (matching `renderer.tsx`'s existing behavior) —
  confirming preview intentionally does *not* pre-validate.
