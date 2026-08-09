# Plan 27 — Page Settings, Page References, and Connected Navigation

## Objective

Pages exist but cannot be configured, and nothing connects them. A
portfolio's pages are currently reachable only by whatever raw string an
author or the AI happened to type into a `Link`.

Deliver: editable page name and slug from a right-click menu, and links
that reference a **page**, not a path — so renaming a page can never break
navigation.

## Evidence

From the live document (`Silence Studio`):

```
page: Home        /
page: about       /page-3
page: contact us  /page-3-2

Link - Work      href: "#work"
Link - Contact   href: "/contact"      ← points at no existing page
Link - Twitter   href: "https://twitter.com"
```

The paths are auto-generated leftovers: `suggestPath`
(`components/editor/PageSwitcher.tsx:42`) already slugifies and
de-duplicates correctly, but it only runs at **create** time against the
auto name "Page 3". Renaming the page afterwards never updates the path.

`Link - Contact` points at `/contact`, which does not exist. Published,
`resolvePageFromPath` (`lib/builder/content.tsx:93-101`) falls back to the
index page — so a broken link silently renders the wrong page instead of a
404. That is worse than a visible failure, and it is what makes Stage 1
non-negotiable.

## Already implemented — do not rebuild

- **`UpdatePage { pageId, name?, path? }`** (`builder/history/types.ts:76-79`)
  — renaming and re-pathing are already validated, undoable commands.
- **`CreatePage` / `DeletePage` / `ReorderPage`** — the page command set is
  complete.
- **`suggestPath`** — slugify + collision suffix. Reuse it; do not write a
  second slugifier.
- **`normalizePagePath`** (`lib/builder/content.tsx:76`) — the one place
  path comparison is defined.
- **`ContextMenu`** — already used in `Canvas.tsx`.

## Context every agent must read first

- `builder/CONTRIBUTING.md` — rule 3 (all edits are commands), rule 7
  (renderers never modify documents).
- `AGENTS.md` — **this is not the Next.js you know.**
- **ADR-008 (additive document evolution)** — this plan adds props and a
  resolution step; nothing is removed or renamed. No new ADR required.

**Staged. Stop for review after each stage. Stage 1 must land before
Stage 2** — see "Order" below.

## Order — why references come before the slug editor

Shipping the slug editor first means the moment an author renames
`/page-3-2` to `/contact-us`, every link holding the old path breaks, with
the fallback above hiding the breakage. Then links have to be migrated
under pressure.

With page references landed first, slug editing is safe on day one because
no link ever stores a path.

---

## Stage 1 — Links reference pages, not paths

### 1a. `Link` gains a target mode

Extend `LinkComponent` (`builder/components/link.tsx`):

- `linkType`: select — `page` | `url` (default `url`, so existing nodes
  keep behaving exactly as they do now).
- `pageId`: the target page when `linkType` is `page`.
- `href`: unchanged, used when `linkType` is `url`.

Apply the same to `LinkBlock` — it has the same problem and authors will
not accept the two behaving differently.

**A page picker needs dynamic options, and `PropertyField.options` is
static** (fixed at registration, `builder/registry/types.ts`). Do not try
to stuff the page list into the definition — it is per-document and
changes as pages are added.

Add a `"page"` field type instead, rendered specially by the Inspector
from the current document's pages. There is a precedent: `"image"` is
already a declared type the Inspector renders with its own control rather
than a generic input.

### 1b. Resolve `pageId` → `href` in the render walker

`ComponentRenderer` is frozen to `{ id, props, children }` — a Link cannot
reach the document, and **it must not**: rule 7 keeps renderers pure.

Resolve in the tree walker instead, exactly as styles already are.
`mergeStyleIntoProps` (`builder/styles/apply.tsx`) resolves `node.styles`
into `props.style` before invoking the component; page references follow
the same shape — resolve `pageId` to the page's current path and inject it
as `href`.

**Resolving to the bare page path is wrong, and this plan originally said
to do exactly that.** Page paths are document-relative (`/`, `/work`) but a
portfolio is mounted at `/p/<slug>` (and `/embed/<slug>`). Emitting `/work`
navigates to the site root, which is not the portfolio and does not exist:

```
published at  /p/silence-studio-mNT1-k
link resolves /work           ← 404
should be     /p/silence-studio-mNT1-k/work
```

`RenderContext` therefore carries a `basePath`, supplied by whichever route
mounts the document, and the index page maps to the mount point itself
rather than `<base>/`. The editor canvas passes nothing, since links there
are not navigated. **Landed** — `joinBasePath` in
`builder/pages/resolve-links.ts`.

**The walk is duplicated.** `builder/renderer/renderer.tsx` and
`renderStyledNode` in `styles/apply.tsx` both traverse the tree. Resolution
must apply on every path that renders — canvas, preview, and published —
or the editor and the live site will disagree. Put it in one shared helper
and call it from both; do not copy the logic.

### 1c. In-page anchors need a real element id

The model emits `#about`, and nothing in the tree has `id="about"` — nodes
carry `data-node-id`, which a fragment link cannot target. Every hash link
in a generated page is inert.

`Section` takes an **author-set `anchor` prop** rendered as the element's
`id`. Author-set, not derived from the section name, for the same reason
links reference page ids: renaming a section must not silently break every
link pointing at it. **Landed** — `builder/components/section.tsx`.

Stage 3 must teach the model to set `anchor` on any section it links to,
or it will keep emitting hash links to nothing.

### 1d. Dangling references must fail visibly

A link whose target page has been deleted must render with **no `href`**,
never a guessed path. Combined with the index fallback above, guessing is
how a broken link becomes an invisible wrong-page render.

Surface it in the editor — the Navigator or Inspector should show that the
target is missing. Do not delete the `pageId`; the author may be
mid-restructure, and silently clearing their intent is worse than showing
a warning.

### Stage 1 acceptance

- Four gates clean; `npm test` passes with no key and no network.
- Unit: a `page`-type link resolves to its target's current path; changing
  the page's path changes the rendered `href` with no edit to the link.
- Unit: a link to a deleted page renders without `href` and does not throw.
- Existing `url` links render byte-identically to before.
- Canvas, preview, and published output all resolve — verified, not assumed.

---

## Stage 2 — Page settings modal

### 2a. Right-click menu on page rows

`ContextMenu` on each row in `PageSwitcher`: **Settings…**, **Duplicate**,
**Delete**. Delete keeps the existing "a portfolio must have at least one
page" guard.

### 2b. The settings dialog

Fields: **Name**, and **Slug** with a live preview of the resulting path.

- Slug **auto-derives from the name until the author edits it**, then stops
  following. An author who typed a slug will not accept it being
  overwritten on the next rename.
- Derive with the existing `suggestPath`. **Extract it** so create and edit
  share one implementation — two slugifiers will diverge.
- Validate on the way in: collisions against other pages (compare through
  `normalizePagePath`, not raw strings), empty slug, characters that are
  not URL-safe.
- Name and slug commit as a **single `UpdatePage`**, so one Cmd+Z undoes
  the edit rather than two.

### 2c. Two cases that need explicit handling

**The index page.** `resolvePageFromPath` falls back to the page at `/`.
If an author slugifies every page away from `/`, the site has no index.
Either keep `/` pinned for one page or warn clearly — decide and say which.

**Already-published pages.** Changing a slug changes the public URL;
bookmarks and search results break. Say so in the dialog when the
portfolio is published. Redirects are out of scope — note as follow-up.

### Stage 2 acceptance

- Rename a page; its slug follows until manually edited, then holds.
- Links to that page keep working with no edit — the Stage 1 payoff,
  verified end to end through publish.
- Colliding slugs are rejected with a message naming the conflict.
- One undo reverts a combined name + slug change.

---

## Stage 3 — Teach the AI to link pages

The model emits `href: "#work"` and `/contact` into navbars that lead
nowhere. It cannot do better: nothing in the prompt tells it pages exist.

- List the document's pages — id, name, path — in the system prompt.
- Instruct: internal navigation uses `linkType: "page"` with a `pageId`
  from that list; `href` is for external URLs only.
- **Validate in `translate.ts`**: a `pageId` that matches no page is a
  hard error, the same way an unknown `componentType` is. Model output is
  untrusted, and a bad reference here produces the silent wrong-page render
  described above.
- Warn when a `url` link's href looks internal (starts with `/` or `#`) —
  measurable signal for whether the prompt guidance is landing.

### Stage 3 acceptance

- A generated navbar links real pages; clicking through works in preview
  and published.
- Off-target `href` rate reported over three generations, as Plan 26
  Stage 1 does for colour drift.

---

## Non-goals

- No redirects for changed slugs.
- No nested or dynamic routes; one flat path per page.
- No auto-migration of existing raw hrefs to page references. Matching
  paths to pages is right most of the time and untraceable when it is
  wrong — leave authored links alone.
- No sitewide navigation component that syncs across pages.
- No i18n or per-locale paths.

## Overall acceptance

- Renaming a page updates its slug, its published URL, and every link that
  targets it — with no manual link edits anywhere.
- A link to a deleted page renders inert and is visible as broken in the
  editor; it never silently renders the index page.
- Existing documents open and publish unchanged before any page is edited.
