# Plan 25 — AI Visual Fidelity: The Style Channel, Icons, and Overlays

## Objective

Plan 19 made AI generation *structurally* correct: the model emits
operations, they translate to `Command`s, they apply through
`EditorSession`. The tree it produces is right. The page it produces is
blank-looking.

This plan closes the gap between those two facts. The target is
`docs/plans/assets/25-target-about-page.png` — an About page with a
photographic banner, an overlay-capable image frame, icon-bearing service
cards, an icon-led process list, a badge pill, rules, and an accent
callout. **A single AI prompt should be able to produce that page.**

That image is the acceptance criterion for this plan. Open it before
reading further.

## Decisions already made — do not relitigate

The owner has settled these. They are not open questions:

1. **Fidelity bar: same class of quality, not a pixel replica.** Output
   must have real colour, spacing, icons, image overlays, and card
   surfaces — it must look designed. It does not have to reproduce the
   reference exactly. Do not burn time chasing the last 10%; a system that
   only does that one page well is a failure.
2. **Icons come from `lucide-react`.** Already a dependency (`^0.575.0`),
   already used across the editor UI. See Stage 2.
3. **Images: two mechanisms.** A curated Pexels placeholder set for the AI
   to draw on, plus provider-backed user uploads — Cloudinary first, an
   internal S3 tool later, behind one interface. Signed direct-to-provider
   uploads, per-user asset library, size reduction on the way in *and*
   out. See Stage 5. This reverses the "no blob storage" non-goal that
   Plan 24 and this plan's first draft both carried.
4. **Malformed styles are normalised and warned about, never dropped or
   fatal.** See Stage 1b.
5. **Generation is section-by-section, not whole-page.** See Stage 1d.

## Why the current output looks flat

The audit below distinguishes three very different failure modes, and
they need different fixes. Do not lump them together.

| # | Reference feature | Engine support | Why it doesn't happen |
|---|---|---|---|
| 1 | Any colour, radius, shadow, spacing | **Full** — `builder/styles/fields.ts` exposes ~50 CSS keys | The AI is never told the style vocabulary exists, and unvalidated style shapes are silently discarded. **Blocking; fix first.** |
| 2 | Image overlay / scrim banner | **Full** — `position`, `top/right/bottom/left`, `zIndex`, `overflow`, `backgroundImage` (accepts gradients) | No recipe in the prompt; `Image` has `allowedChildren: []` so the naive nesting attempt is rejected |
| 3 | Icons (7 in the reference) | **None in the builder** — though `lucide-react` is already a dependency and used in the editor chrome | No `Icon` component in the registry; `Text`/`Heading` render escaped strings, so inline SVG is impossible |
| 4 | Cropped/tall photo | Partial | `Image` has no `objectFit`/`aspectRatio` prop and hardcodes `height: auto` |
| 5 | A real photograph | **None** | `src` is an `"image"` field with an Inspector picker; no upload path, no storage, no `Asset` model, and the AI has no asset list it can name |
| 6 | Inline accent (the "." after *feature*) | **None** | `Heading` takes one string; `"richtext"` is declared in `PropertyField` but unimplemented |

## Context every agent must read first

- `builder/CONTRIBUTING.md` — non-negotiable. Rules 3 (all edits are
  commands), 4 (components register), and 6 (AI speaks `Command`s, never
  HTML) all bind this plan.
- `AGENTS.md` — **this is not the Next.js you know.** Read the relevant
  guide in `node_modules/next/dist/docs/` before writing Next.js code.
- `docs/plans/19-ai-page-generation.md` — what already exists. Do not
  rebuild it.
- ADR-005, ADR-006.

**This plan is staged. Stop for review after each stage.** Stage 1 is a
hard prerequisite for every other stage — a prettier prompt is worthless
while styles are being dropped on the floor.

---

## Stage 1 — Repair the style channel (blocking)

### 1a. Confirm the diagnosis before changing anything

The claim is that AI-authored styles are **silently discarded** when the
model emits a flat declaration instead of a breakpoint-keyed one:

- `builder/styles/types.ts` defines `NodeStyleRules =
  Partial<Record<Breakpoint, ResolvedStyleDeclaration>>` — styles must be
  `{ base: { … } }`.
- `builder/ai/schema.ts` types `styles` as a bare
  `z.record(z.string(), z.unknown())` — any shape passes.
- `builder/ai/translate.ts:73` does `styles: (operation.styles ?? {}) as
  NodeStyles` — a cast, no validation.
- `resolveNodeStyle` (`builder/styles/resolve.ts:24`) walks
  `base`/`sm`/`md`/`lg` and returns `{}` when none are present.

So `{ backgroundColor: "#fff" }` is stored, rendered as nothing, and no
error is raised anywhere.

**Verify this first, do not assume it.** Run a real generation against a
configured endpoint, then inspect the persisted document JSON for the
generated nodes and report the actual shape of `node.styles`. If the
model is in fact emitting `base` correctly and the flatness has another
cause, **stop and report that** — the rest of this stage is written
against the diagnosis above and would be the wrong fix.

### 1b. Validate `styles` at the schema boundary

Replace the permissive `propsRecord` for `styles` in
`builder/ai/schema.ts` with a breakpoint-keyed schema: keys constrained
to `base | sm | md | lg`, values a record of `string | number`.

**Decided: normalise, don't reject.** A flat declaration gets wrapped
into `base` and a warning is logged. One malformed style out of forty
operations must not throw away an otherwise-good generation, and silently
dropping it is the exact bug this stage exists to fix.

The normalisation must be **explicit code with a test**, not a cast.
Unknown style keys (ones not in `fields.ts`) are dropped with a warning
naming the key — that is untrusted model output reaching a DOM `style`
attribute, so it gets filtered, not forwarded.

Either way: **no style value may reach the document unvalidated.** Model
output is untrusted input (Plan 19, deliverable 5).

### 1c. Teach the prompt the style vocabulary

`buildAIPrompt` (`builder/ai/prompt.ts`) currently emits only component
types, `propertySchema`, `defaultProps`, and constraints. Add, built from
the live sources so it cannot drift:

- The style-field vocabulary from `builder/styles/fields.ts`, grouped as
  it is there (layout / spacing / size / position / typography /
  backgrounds / borders / effects). Include `hint` text where present —
  `boxShadow` and `transform` are free-text fields and the hints are the
  only syntax guidance.
- The breakpoint-keyed shape, with one concrete example.
- The palette and scales from `builder/styles/tokens.ts`. These are
  currently invisible to the model, which is why nothing it produces
  shares a colour or a spacing rhythm.

Keep `buildAIPrompt` a pure function of `(registry, document,
userPrompt)`. Its existing test asserts every registered component
appears; add the equivalent for style groups and tokens.

### 1d. Token budget — generate section by section

`maxOutputTokens` is 16,000, with a comment recording that 4,096 truncated
mid-object. Styling every node multiplies output JSON several-fold, and a
truncated response is a total loss: the partial JSON fails to parse and
the user gets an error, not a half-built page.

**Decided: section-by-section generation is the target shape.** A request
produces one section, not a whole page. This always fits, gives the user
visible progress and per-section control, and fails cheaply.

Within this stage, just **measure and report**: run a realistic styled
section and a full-page attempt, and report actual output token counts for
both. That number sizes the work. The section-by-section UI itself is
Stage 4's concern — do not build it here.

The known cost of this choice is cross-section consistency: the model sees
less at once, so shared colour and rhythm have to come from the token
palette in the prompt (1c) rather than from the model remembering what it
just did. That is a reason to get 1c right, not a reason to reopen the
decision.

### Stage 1 acceptance

- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build` clean.
- Unit test: a flat style declaration from the model either fails schema
  validation or lands under `base` — asserted, not assumed.
- Unit test: `buildAIPrompt` output contains the style groups and the
  token palette.
- **Manual:** generate a section and confirm in the persisted document
  that `node.styles.base` is populated, and that those styles are visible
  on canvas *and* in published output.

---

## Stage 2 — The `Icon` component

The reference uses seven icons; three sit inside tinted circles. There is
no way to express any of them today.

**Decided: use `lucide-react`.** It is already a dependency
(`^0.575.0`) and already used across the editor chrome —
`components/editor/{Navigator,StyleInspector,CanvasToolbar,ViewportToggle,PageSwitcher}.tsx`.
Do not hand-write SVG paths, and do not add a second icon library.

Add `builder/components/icon.tsx` following the existing
`ComponentDefinition` pattern (`image.tsx` is the closest model) and
register it in `builder/components/index.ts`.

**Curate a subset — do not expose all of lucide.** The library ships
1,500+ icons. Define an explicit map in `builder/components/icon-set.ts`
of roughly 40–60 icons with **static named imports**, so the bundler
tree-shakes to only what's listed:

```ts
import { Ear, Send, Minus, Box, Leaf, /* … */ } from "lucide-react";
export const ICON_SET = { ear: Ear, send: Send, /* … */ } as const;
```

Three reasons this is a curated map and not free text:

- The `select` options flow into the AI prompt automatically via
  `formatPropertySchema` in `prompt.ts` — a bounded list is the only way
  the model picks icons that exist.
- A bounded set is what keeps a generated page visually coherent.
- Wildcard or dynamic imports defeat tree-shaking and would pull the whole
  library into the bundle.

Cover what the reference implies plus obvious neighbours: listen/ear,
send, minus, box, window, badge, leaf, arrow directions, check, x, mail,
link, star, calendar, clock, map-pin, phone, download, external-link,
search, plus, heart, quote, sparkles. Name keys **semantically**
(`listen`, not `ear`) where the meaning is the point.

Other requirements:

- **Size and colour come from the existing style engine**, not new props.
  Render with `size="1em"`, letting lucide's default
  `stroke="currentColor"` stand, so the Design panel's `fontSize` and
  `color` drive it. Do not add `size`/`color` props that duplicate style
  fields.
- **Unknown `name` must not crash.** Documents outlive icon sets — if a
  saved node names an icon later removed from the map, render a fallback
  glyph. A published page must never white-screen over a missing icon.
- `constraints: { allowedChildren: [] }`.
- Register the definition's `icon` (the Navigator/Toolbox glyph) too;
  every other built-in has one. Use a lucide glyph for consistency.
- The circle behind an icon is **not** part of this component. It is a
  styled `Container` wrapping the `Icon` — that's Stage 4's recipe.

Report the bundle-size delta for the published output. If the curated
import turns out not to tree-shake as expected, say so — that changes the
approach and must not be discovered later.

### Stage 2 acceptance

- Icon appears in the Toolbox, is insertable, selectable, renameable.
- `fontSize` and `color` from the Design panel visibly change it.
- Round-trips through publish.
- The enum is listed in the AI prompt automatically via `propertySchema`
  options — verify, don't assume, that `formatPropertySchema` picks it up.
- A node naming a nonexistent icon renders the fallback, on canvas and
  published. Test this explicitly.
- Published bundle size delta reported.

---

## Stage 3 — Image affordances and the overlay pattern

### 3a. `Image` props

Add `objectFit` (`select`: cover / contain / fill / none) and
`aspectRatio` (string, e.g. `3/4`). The renderer currently hardcodes
`maxWidth: 100%, height: auto` *before* spreading `style`, so overrides
work — but a tall cropped photo should not require hand-written style
overrides for something this common.

**Coordinate with Stage 5d**, which adds `srcset`/`sizes`/`loading` to the
same component. Either do 3a knowing 5d is coming and leave the seam
obvious, or fold them together — but do not rewrite `image.tsx` twice
from scratch.

### 3b. Decide the overlay shape

`ImageComponent` has `constraints: { allowedChildren: [] }`, so overlays
must be a sibling inside a `position: relative` parent:

```
Container   base { position: relative, overflow: hidden, borderRadius: 24px }
├─ Image    base { width: 100%, height: 100%, objectFit: cover }
└─ Container base { position: absolute, inset 0, backgroundImage: linear-gradient(...) }
   └─ Heading / Text / Icon
```

This works today. **Recommendation: keep it and document it** rather than
loosening `Image`'s constraints — an `<img>` cannot have children in HTML,
so allowing them in the document model would create a node tree the
renderer can't honour. If you disagree, argue it in the report before
changing the constraint.

Do **not** invent a `Banner` or `Overlay` component. `builder/` must not
learn what a banner is (CONTRIBUTING rule 5); composition of primitives is
the correct answer here.

### Stage 3 acceptance

- The overlay stack above renders correctly on canvas and published, at
  all four breakpoints.
- `objectFit: cover` with a fixed `aspectRatio` crops rather than
  distorts.

---

## Stage 4 — Design direction in the prompt

With Stages 1–3 landed the primitives all exist, and the model will still
produce something flat, because `buildAIPrompt` gives it **zero design
direction**. Add a compact design brief to the system prompt:

- **Composition recipes**, each 3–6 lines, as node-tree sketches:
  overlay banner (from 3b), card surface (radius + padding + tinted
  background), icon-in-circle (Container with `borderRadius: 9999px`,
  fixed square size, centred flex, tinted background, `Icon` inside),
  divider rule, badge pill, two-column split (`Grid`).
- **The `Image` no-children rule**, stated explicitly, or the model will
  keep generating a rejected operation.
- **Rhythm guidance**: use the spacing scale, not arbitrary pixel values;
  keep the type scale to a handful of steps; derive tints from the token
  palette rather than inventing hex values per node.

Keep this generated from the live registry and token set where possible,
so it can't drift from what the engine actually supports. Recipes are
necessarily hand-written prose — keep them in one clearly-marked constant
in `prompt.ts`, not scattered.

**Scope discipline:** this is prompt content, not a template library. Do
not add stored page templates in this stage.

### 4b. Section-scoped generation

Per the 1d decision, a request generates **one section**, not a page. This
is where that lands.

- The prompt frames the task as "produce one section", and the existing
  serialized document gives the model the surrounding context so a new
  section fits what's already there.
- `AIPanel.tsx` gets the corresponding UX: the user generates a section at
  a time and sees each one land. Keep it simple — a prompt box that
  appends a section is enough; no queue, no multi-section orchestration.
- **Consistency is the risk.** The model no longer sees the whole page
  in one shot, so shared colour and spacing have to come from the token
  palette (1c) and the recipes above. Generate three consecutive sections
  and report whether they read as one page or three unrelated ones. If
  they don't cohere, say so plainly — that is the signal that the palette
  guidance in 1c is too weak, not a reason to go back to whole-page.

### Stage 4 acceptance

- Generate the About page from a prompt describing the reference. Capture
  a canvas screenshot and put it side by side with
  `docs/plans/assets/25-target-about-page.png` in your report.
- Three consecutively generated sections read as one coherent page.
- Report honestly what does *not* match. Partial fidelity is expected at
  this point — the photograph is Stage 5's problem. Remember the bar is
  *same class of quality*, not pixel parity.

---

## Stage 5 — Images: placeholders and real uploads

Two separate problems, solved by two separate mechanisms. Keep them
separate — conflating them is the main way this stage goes wrong.

- **5a — Placeholders.** The AI needs a bounded list of images it can
  name, so generated pages aren't gap-toothed. Bundled, curated, sourced
  from Pexels.
- **5b–5e — Uploads.** The user needs their own photographs in their own
  portfolio. Provider-backed (Cloudinary now, S3 later), with size
  reduction on the way in and on the way out.

**This reverses a documented non-goal.** Plan 24 deferred upload for lack
of a storage dependency, and Plan 25's own first draft repeated the
deferral. The owner has since approved provider-backed uploads. Record the
reversal; don't treat the old exclusion as binding.

**Decisions already made for this stage:**

1. Cloudinary first. The S3 adapter is a **stub against the interface**,
   filled in when the internal tool is identified. Do not design S3
   specifics on speculation.
2. **Signed direct-to-provider upload** — the browser sends bytes to the
   provider, never through our compute.
3. **Per-user asset library** — assets belong to the user and are reusable
   across their portfolios.

---

### 5a. Placeholder set from Pexels

**A curated set of placeholder photographs sourced from Pexels, bundled
into the repo.** These are placeholders, not the user's real content — the
point is that generated pages look complete instead of gap-toothed.

- **Download them; do not hotlink.** Files live under `public/` and are
  served from the same origin. Hotlinking Pexels' CDN would make every
  published portfolio depend on a third party staying up and not changing
  URLs — placeholders that 404 are worse than no placeholders.
- **Roughly 12–20 images**, chosen to span the shapes a portfolio needs:
  portrait, landscape, wide banner, square. Neutral and calm, in the
  spirit of the reference — a loud stock photo makes every generated page
  look worse.
- **Optimise before committing.** Report the total added repo size. If the
  set exceeds a few MB, compress harder or cut the count; do not commit
  10MB of JPEGs.
- **A manifest the AI can read**, e.g. `builder/assets/placeholders.ts`:
  each entry with a stable key, path, aspect ratio, and a short
  description ("potted plant, warm neutral, portrait"). The prompt lists
  these so the model can pick one that fits the slot. Same reason as the
  icon enum: a bounded, nameable list.
- **Record provenance.** Pexels' licence permits free commercial use
  without attribution, but "we believe it's fine" is not a record. Note
  each photo's source URL and photographer in the manifest, and confirm
  the licence terms at time of download rather than trusting this
  paragraph.
- The same manifest should feed the Inspector's image picker (as a
  "Placeholders" tab alongside the user's uploads from 5e), so a human gets
  the same set. Do not build two lists.

---

### 5b. `AssetStorageProvider` — the abstraction

Follow the pattern the AI provider already established (ADR-005): the app
depends on an interface, never on a vendor SDK. `builder/ai/types.ts` and
`openai-compatible-provider.ts` are the model to copy — one file imports
the vendor SDK, nothing else does.

Define in `builder/assets/types.ts`:

```ts
export interface AssetStorageProvider {
  readonly name: string;
  /** Short-lived credentials for a direct browser upload. */
  createUploadTicket(input: {
    userId: string;
    contentType: string;
    byteSize: number;
  }): Promise<UploadTicket>;
  /** Confirm and normalise what the provider actually stored. */
  finalizeUpload(payload: unknown): Promise<StoredAsset>;
  /** Delivery URL at a requested width/format. */
  getUrl(asset: StoredAsset, opts?: { width?: number; format?: "auto" }): string;
  delete(asset: StoredAsset): Promise<void>;
}
```

`getUrl` is the load-bearing method — it is what makes 5d work on
Cloudinary and degrade honestly on plain S3. Do not omit it and hardcode
URLs at call sites.

Provider selection is **configuration, not code**: an `ASSET_PROVIDER` env
var picks the adapter, exactly as `AI_BASE_URL` picks the model endpoint.
Document every variable in `.env.example` with an empty value.

**Never commit a real key.** Cloudinary's API secret is server-only — it
must not reach the client bundle, so it cannot be `NEXT_PUBLIC_*`. The
signature is computed in a server action; the browser receives only the
signature, timestamp, and public cloud name.

- `builder/assets/cloudinary-provider.ts` — the only file importing the
  Cloudinary SDK.
- `builder/assets/s3-provider.ts` — **stub**. Implement the interface,
  throw a clear "not configured" error, and write down in comments what is
  unknown (endpoint style, credential source, CDN in front, whether any
  transform service exists). When the internal tool is identified this
  becomes a small, well-specified job.

### 5c. Upload pipeline with size reduction on the way in

**Requirement, not a nice-to-have.** A phone camera photo is 4–12MB at
4000px wide. Nothing in a portfolio needs that, and uploading it wastes
the user's bandwidth before any server-side transform can help.

- **Downscale and re-encode in the browser before upload.** Cap the long
  edge (~2560px is generous for a full-bleed banner), re-encode to WebP
  where the browser supports it, and target a sane quality. Use a canvas
  or `createImageBitmap` — **do not add an image-processing dependency**
  for something the platform does natively.
- **Preserve the original's aspect ratio exactly.** A silently squashed
  headshot is worse than a large one.
- **Report real numbers**: before/after byte size and dimensions for a
  typical phone photo. "It compresses" is not a result.
- **Enforce limits server-side too.** The client-side resize is a
  courtesy, not a control — a crafted request can skip it. The upload
  ticket must cap `byteSize` and restrict `contentType` to an image
  allowlist, and the provider must be configured to reject oversized
  uploads. Model output and browser input are both untrusted.
- **Strip EXIF**, which the canvas re-encode does for free. Say so
  explicitly in the report, because it matters: phone photos carry GPS
  coordinates, and publishing someone's home location because they used a
  photo of their desk is a real privacy failure. Note the trade-off —
  re-encoding also drops EXIF orientation, so apply orientation during the
  resize or portrait photos will publish sideways.

### 5d. Size reduction on the way out

Uploading a smaller file is half the job; published pages must also not
serve a 2560px image into a 400px card.

- **Cloudinary**: use delivery transformations — `f_auto` for format
  negotiation and `q_auto` for quality, plus explicit widths. This is
  Cloudinary's actual strength and the reason it's a good first adapter.
- **Plain S3 with no transform service**: `getUrl` returns the stored
  original. That is a real limitation — write it into the S3 stub's
  comments rather than pretending width requests work everywhere.
- **`Image` must emit `srcset` + `sizes` and `loading="lazy"`** for
  provider-backed assets, generated from `getUrl` at a few widths. Without
  this, 5c's savings are lost at render time. This extends Stage 3a's
  `Image` work — coordinate the two, don't edit `image.tsx` twice.
- Keep `Image` honest about provenance: a plain URL still works
  unchanged. `srcset` generation applies only where the asset came from a
  provider.

### 5e. `Asset` model and the Inspector picker

- Prisma migration adding an `Asset` model keyed to `userId` (per-user
  library), storing the provider name, provider-side id, dimensions, byte
  size, content type, and `createdAt`. Follow the existing `Portfolio`
  model's conventions.
- Server actions for ticket creation, finalisation, listing, and deletion.
  All of them auth-check with the existing `requireOwnedPortfolio` /
  `getSession` pattern — **an upload ticket is a capability**, and an
  unauthenticated one is an open write endpoint on your paid storage
  account.
- The Inspector's `image` field (Plan 24, Stage 1c) becomes a real picker:
  the user's uploads plus the placeholder set, with a thumbnail grid and an
  upload button. It must still accept a pasted URL and still render `data:`
  URIs — the seed fixture uses them.
- **Deleting an asset that a page references** must not silently break the
  page. Decide and state the behaviour: block deletion with a "used in N
  places" warning, or allow it and fall back to the placeholder frame.
  Either is defensible; silently serving a broken image is not.
- **The AI does not get upload access.** It picks from placeholders (5a)
  only. Generation must never create storage writes.

### Stage 5 acceptance

- All four gates clean.
- `npm test` passes with **no Cloudinary credentials and no network** —
  provider integration tests skip when the key is absent (Plan 16's rule).
- Before/after byte sizes reported for a real phone photo, end to end:
  original → client-resized upload → delivered `srcset` candidate.
- Cloudinary's API secret is absent from the client bundle. Verify by
  grepping the built output, not by inspecting the source.
- An unauthenticated request cannot obtain an upload ticket. Test it.
- A published page serves an appropriately-sized image at mobile and
  desktop widths — check the actual bytes transferred in devtools, not just
  that it renders.
- The S3 stub fails with a clear, actionable error rather than a crash.

---

## Stage 6 — Inline accent spans (cut)

The coloured "." after *a feature* needs inline rich text. `Heading` takes
a single string; `"richtext"` is declared in `PropertyField`
(`builder/registry/types.ts:22-31`) and unimplemented in the Inspector.

**Cut from this plan.** It is a real feature with real scope — an inline
model, an editing surface, a serialisation format, publish-side escaping —
and it buys one decorative dot. The agreed fidelity bar is *same class of
quality*, not pixel parity, and this is exactly the kind of last-10% chase
that bar exists to prevent. The workaround, if anyone wants it, is a row
`Stack` of two `Heading`s.

---

## Non-goals

- No new business-specific components (`Banner`, `ServiceCard`, `Hero`).
  Composition of primitives only — CONTRIBUTING rule 5.
- No stored page templates.
- No second icon library, and no hand-written SVG icon set —
  `lucide-react` only.
- No hotlinking the Pexels CDN for the bundled placeholder set.
- No image generation (Plan 19 non-goal, still binding).
- No vendor SDK outside its one adapter file — Cloudinary's SDK is
  imported in `cloudinary-provider.ts` and nowhere else.
- No image-processing dependency for client-side resize; the browser
  already does it.
- No S3 implementation on speculation — stub only until the internal tool
  is identified.
- No changes to `builder/history/*` or `builder/document/*`.
- No streaming or partial application.

## Overall acceptance

- All four gates clean at every stage: `npx tsc --noEmit`, `npm test`,
  `npm run lint`, `npm run build`.
- `npm test` still passes with **no API key and no network** (Plan 16's
  rule) — provider integration tests skip when the key is absent.
- Section-by-section prompting builds a page in the same class as
  `docs/plans/assets/25-target-about-page.png`: overlay-capable image
  frame with a real placeholder photo, lucide icons in tinted circles,
  tinted card surfaces, badge pill, rules, accent callout. Screenshot side
  by side. **Not** a pixel replica — judged on whether it reads as
  designed.
- Every generated node remains individually selectable, editable, and
  undoable — verify ADR-006 compliance explicitly; no code path may write
  HTML or a raw document.
- Published output matches canvas, including at `sm`/`md`/`lg`.
