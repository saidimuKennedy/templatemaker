# Plan 15 — Publish Surfacing: Embed + Export (closes Phase 5)

## Objective

`docs/06-development-roadmap.md` Phase 5 lists Preview, Publish,
**Embed**, and **Export**. Preview and Publish ship. The other two are
implemented in the engine but unreachable by a user:

- `renderEmbed` (`builder/publish/embed.ts`) is fully implemented and
  smoke-tested — verified: it is referenced **nowhere** in `app/`. The
  `embedded-crm` render target from architecture spec §8 has no route.
- `exportDocumentJson` is only used internally as the save/publish
  serialization payload. There is no user-facing export.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, do not modify):
- `builder/publish/embed.ts` — `renderEmbed(document, registry, renderer?, currentStatus?)`
  returns `PublishOutcome` (validates first, then renders with
  `target: "embedded-crm"`).
- `builder/publish/export.ts` — `exportDocumentJson(document)`.
- `lib/builder/content.tsx` — `parseBuilderContent`, `renderPublished`
  (note: `renderPublished` injects the responsive `@media` stylesheet
  via `buildResponsiveStylesheet`; your embed route needs the same
  treatment or embedded pages won't be responsive).
- `app/p/[slug]/page.tsx` — the closest existing analogue; copy its
  auth-free public-lookup shape.

## Deliverables

### 1. Embed route — `app/embed/[slug]/page.tsx`

Public, like `/p/[slug]`: look up the portfolio by `slug` where
`status: "PUBLISHED"`, `notFound()` if missing or if
`parseBuilderContent` returns `undefined`.

Render via `renderEmbed(document, registry, undefined, "published")`.
Handle both outcomes: if `outcome.ok === false`, `notFound()` (a
published document failing validation is a real bug, not a normal
path); if ok, render `outcome.output`.

Embed-specific chrome: **no** `min-h-screen`, no page padding, no
max-width cap — an embedded view is dropped into someone else's layout
and must not impose its own. Just render the output plus the responsive
stylesheet.

Add `export const dynamic = "force-dynamic"` or keep
`revalidate = false` consistent with `/p/[slug]` — match whatever that
file does and say which in your report.

Since this is framed for iframe embedding, also verify it isn't blocked
by framing headers: check `middleware.ts` / `proxy.ts` for
`X-Frame-Options` or CSP `frame-ancestors`. If a global header would
block iframing, note it in your report — **do not** weaken security
headers app-wide without flagging it.

### 2. Copy-embed-code UI

In `components/editor/EditorClient.tsx`, next to the existing
Publish/Unpublish buttons, add a **"Copy embed code"** button, shown
only when `status === "PUBLISHED"` and a slug exists. It copies:
```html
<iframe src="{origin}/embed/{slug}" style="width:100%;border:0" title="{title}"></iframe>
```
to the clipboard via `navigator.clipboard.writeText`, and toasts
success/failure using the existing `useToast`.

The slug isn't currently passed to `EditorClient` — thread it through
from `app/(dashboard)/editor/[id]/page.tsx` as a new `slug: string | null`
prop.

### 3. Export JSON download

Also in the editor toolbar, an **"Export JSON"** button (always
available, not just when published). It builds a `Blob` from
`exportDocumentJson(session.getDocument())`, and triggers a download
named `{slug ?? portfolioId}.json` via a temporary object URL
(`URL.createObjectURL` → anchor click → `URL.revokeObjectURL`).

This is a client-only action — no server round-trip, no new server
action.

## Non-goals

- No import-JSON counterpart (round-tripping user-supplied documents
  needs a trust/validation story of its own).
- No static HTML / Next.js / PDF export — architecture spec §8 lists
  those as future targets, not v1.
- No embed access control, signed URLs, or domain allowlisting.
- Don't modify anything under `builder/`.

## Acceptance criteria

- `npx tsc --noEmit`, `npm run build`, `npm run lint` clean.
- `curl` the embed route for a published slug → HTTP 200, body contains
  the rendered nodes **and** the `@media` stylesheet, and does **not**
  contain the dashboard chrome.
- `curl` the embed route for a non-existent slug → 404.
- Manual: "Copy embed code" puts a working iframe snippet on the
  clipboard; pasting that iframe into a scratch HTML file renders the
  portfolio.
- Manual: "Export JSON" downloads a file whose contents parse with
  `JSON.parse` and pass `validateDocumentStructure`.
