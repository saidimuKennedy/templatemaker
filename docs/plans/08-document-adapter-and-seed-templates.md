# Plan 08 — Document Adapter & Seed Templates

## Objective

Replace `lib/schema.ts`'s role (default content + validation for a
`Portfolio.content` JSON blob) with builder-native equivalents: starter
`BuilderDocument` trees for the "executive" and "minimal" templates, a
single shared portfolio `ComponentRegistry`, and save-time validation
built on the engine's own validation functions instead of
`PortfolioDataSchema`.

Can be implemented in parallel with Plan 07 — this plan only references
Plan 07's component `type` strings and prop keys as literals (documented
below), it does not import Plan 07's files directly until final wiring.
If Plan 07 changes a name/key, reconcile before Plan 09 starts.

## Context

Read `builder/CONTRIBUTING.md` first.

Background: `Portfolio.content` in `prisma/schema.prisma` is already a
plain `Json` column — **no Prisma schema/migration change is needed**,
only what's stored inside it changes shape, from `PortfolioData` (see
`lib/schema.ts`) to a serialized `BuilderDocument`. The `Portfolio` model
also has a `templateId: String` column (default `"executive"`) — keep
using it to pick which starter document a new portfolio gets; it is not
being removed in this plan.

Already implemented (read, don't modify):
- `builder/document/types.ts` — `BuilderProject`, `BuilderPage`,
  `BuilderNode`.
- `builder/document/id.ts` — `generateNodeId()`, `generatePageId()`
  (nanoid-based) — use these for every node/page id in your seed
  documents, don't hand-roll ids.
- `builder/document/validate.ts` — `validateDocumentStructure`,
  `validateAgainstRegistry`.
- `builder/document/serialize.ts` — `serializeDocument`,
  `deserializeDocument`, `DocumentParseError`.
- `builder/registry/registry.ts` — `createComponentRegistry()`.
- `builder/components/index.ts` — `registerBuiltInComponents(registry)`.
- `builder/plugins/portfolio/index.ts` (Plan 07, may land concurrently)
  — `registerPortfolioComponents(registry)`. If it hasn't landed yet
  when you start, write against these expected type/prop names (Plan 07
  is pinned to them) and wire the real import once it's available:
  - `ProfileHeader`: props `name`, `tagline`, `bio`, `location`
  - `ProjectCard`: props `title`, `description`, `url`, `tags` (comma
    string), `featured`
  - `SkillGroup`: props `category`, `items` (comma string)
  - `LinksList`: props `github`, `linkedin`, `twitter`, `website`,
    `email`

## Deliverables

New directory: `lib/builder/` (app-level, not inside `builder/` — this
is portfolio-product logic, not engine code; mirrors where `lib/schema.ts`
lives today).

### `lib/builder/registry.ts`

```ts
export function createPortfolioRegistry(): ComponentRegistry {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);
  registerPortfolioComponents(registry);
  return registry;
}
```
A fresh registry per call (cheap, no module-level singleton — Next.js
server components/actions should call this once per request, not share
mutable global state across requests).

### `lib/builder/seed.ts`

```ts
export function createDefaultDocument(templateId: string, projectName: string): BuilderProject
```
Builds a one-page `BuilderProject` (`meta.schemaVersion: 1`,
`createdAt`/`updatedAt` both `new Date().toISOString()`) whose root is a
`Page` node containing, in order:
1. A `Section` wrapping one `ProfileHeader` node with empty string props
   (`name: "", tagline: "", bio: "", location: ""`) — same empty
   defaults `defaultPortfolioData()` uses today.
2. A `Section` wrapping a `Stack` (empty `children: []` — a new
   portfolio starts with zero projects, same as
   `defaultPortfolioData().projects === []`).
3. A `Section` wrapping a `Stack` (empty `children: []` — zero skill
   groups initially).
4. A `Section` wrapping one `LinksList` node with all props `""`.

Branch on `templateId`: `"minimal"` should set the two `Stack` nodes'
`direction` prop to `"column"` and give `Section` nodes a smaller
`padding` (`"sm"`); anything else (including `"executive"`, the default)
uses `direction: "row"` for the projects `Stack` and `padding: "md"` —
this is the entire visual difference between the two starter templates
now (structure is identical, only default prop values differ). Don't
build more templates than these two; that matches
`components/templates/index.ts`'s current `TEMPLATE_OPTIONS`.

Every node needs a real id via `generateNodeId()`; the page needs
`generatePageId()`; the project needs some id too — accept it as a
param (`projectId: string`) rather than generating it here, since the
caller (Plan 09's create-portfolio action) already has the Prisma row's
id and that's the natural `BuilderProject.id`.

### `lib/builder/content.ts`

Replaces `lib/schema.ts`'s `parsePortfolioContent` for the new shape:

```ts
export function parseBuilderContent(raw: Prisma.JsonValue): BuilderDocument | undefined
```
Wrap `deserializeDocument(JSON.stringify(raw))` in a try/catch (the
existing `parsePortfolioContent` swallows parse errors and falls back
to defaults — match that resilience, but return `undefined` on failure
rather than fabricating a fallback document; the caller — Plan 09's
editor page — is in a better position to decide what a corrupt/legacy
row means for its user than this helper is).

```ts
export function validatePortfolioDocument(document: BuilderDocument, registry: ComponentRegistry): ValidationResult
```
Combine `validateDocumentStructure` and `validateAgainstRegistry`
(concat their `errors`, `valid` is the AND of both) — this is the save
path's gate, used before `prisma.portfolio.update` and again before
publish (mirrors what `builder/publish/publish.ts` already does
internally for the *engine's* notion of publish; this app-level helper
exists because saving a draft should validate too, not just publishing).

### `lib/builder/index.ts`

Barrel exporting all of the above.

## Non-goals

- No Prisma schema changes — `content` stays `Json`, `templateId` stays
  as-is.
- No UI, no server actions, no route changes — that's Plan 09.
- Don't delete `lib/schema.ts` yet — Plan 09 still needs to run
  alongside it until cutover, Plan 10 removes it.
- Don't add more than the two existing starter templates
  (executive/minimal).

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: `createDefaultDocument("executive", "proj-1")` and
  `createDefaultDocument("minimal", "proj-1")` both produce documents
  that pass `validatePortfolioDocument(doc, createPortfolioRegistry())`
  with `valid: true`.
- Smoke check: `serializeDocument` → `parseBuilderContent` round-trips a
  seed document unchanged (compare ignoring `meta.updatedAt` if your
  serialize path bumps it — it shouldn't, `serializeDocument` is a pure
  `JSON.stringify`).
- Smoke check: `parseBuilderContent` returns `undefined` (not a throw,
  not a silently-wrong fallback) for `{}`, `null`, and a string that
  isn't valid JSON.
