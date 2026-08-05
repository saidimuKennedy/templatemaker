# Plan 07 — Portfolio Business Components

## Objective

Build the "Business" category components needed to replace the wizard's
fixed profile/projects/skills/links content with generic, registry-driven
nodes, per `builder/CONTRIBUTING.md` rule 5 (*"the engine never imports
business-specific components"*) — these live in `builder/plugins/`, not
`builder/components/`.

## Context

Read `builder/CONTRIBUTING.md` first.

Background: this repo has an existing step-wizard portfolio editor
(`components/editor/steps/*`, driven by `lib/schema.ts`'s
`PortfolioDataSchema`: a fixed `{ profile, projects, skills, links }`
shape) rendered by two hardcoded templates
(`components/templates/ExecutiveTemplate.tsx`,
`MinimalTemplate.tsx`). The whole point of this migration (Plans 07–10)
is to replace that fixed shape with `BuilderDocument` trees built from
registered components, so the editor becomes generic and the wizard's
four content areas become just... nodes.

The database has no real user data in this shape (confirmed dev-only) —
you do not need a data migration path, just a clean new component set.

Already implemented (read, don't modify):
- `builder/registry/types.ts` — `ComponentDefinition`, `PropertyField`,
  `NodeConstraints`.
- `builder/registry/registry.ts` — `createComponentRegistry()`.
- `builder/components/*` — the existing generic Layout/Content/Interaction
  components (`Page`, `Section`, `Container`, `Stack`, `Heading`, `Text`,
  `Image`, `Button`). Follow their exact pattern (plain function
  component, small inline SVG icon, `propertySchema` matching
  `defaultProps` keys 1:1) — don't reinvent conventions.
- `builder/renderer/renderer.tsx` — confirms invocation shape:
  `<Component id={node.id} props={node.props}>{children}</Component>`.
  No `styles` prop (Style Engine threads styles through `props.style` —
  see `builder/styles/apply.ts` — components read `props.style` the same
  way `Stack`/`Section` already do... actually check: current built-ins
  don't read `props.style` at all yet. Match that same baseline — spread
  `props.style` onto your root element if present, for consistency with
  how `builder/styles/apply.tsx`'s `mergeStyleIntoProps` will hand it to
  you: `<div style={props.style as React.CSSProperties}>`).
- **Every component's root DOM element must carry `data-node-id={id}`**
  (and ideally `data-node-type="<Type>"`), matching every existing
  component in `builder/components/*`. Plan 09's editor canvas does
  click-to-select by delegating on `[data-node-id]`, so skipping this
  attribute silently breaks selection for whichever node omits it.

## Deliverables

Directory: `builder/plugins/portfolio/`. This is a business-specific
plugin package — a peer of `builder/components/`, not inside it.

Read `lib/schema.ts` fully before starting — it is the ground truth for
exactly which fields exist today (`ProfileSchema`, `ProjectSchema`,
`SkillGroupSchema`, `LinksSchema`).

### `builder/plugins/portfolio/profile-header.tsx`

Component `type: "ProfileHeader"`, category `"Business"`.
Props: `name: string`, `tagline: string`, `bio: string`, `location:
string` (all default `""`). Renders name as an `<h1>`, tagline as a
`<p>` styled distinctly (e.g. a `data-role="tagline"` attribute — no
new CSS system, keep it plain), bio as a `<p>`, location as a small
`<p>`. Leaf node (`constraints: { allowedChildren: [] }`).
`propertySchema`: one `"string"` field per prop above.

### `builder/plugins/portfolio/project-card.tsx`

Component `type: "ProjectCard"`, category `"Business"`.
Props: `title: string`, `description: string`, `url: string`, `tags:
string` (comma-separated — the engine's `PropertyField` has no list/array
type yet; storing tags as a single comma-separated string and splitting
on render is the pragmatic v1 choice, matching how a single `"string"`
inspector field can represent it. Note this as a known limitation in
your final report — a future `"list"` `PropertyField.type` is the
proper fix, but that's a `builder/registry` contract change out of
scope here), `featured: boolean` (default `false`).
Render: title as `<h3>`, description as `<p>`, `tags` split on `,` and
trimmed into a small inline list of `<span>`s, `url` as an `<a>` wrapping
a "View project" label (omit the link entirely if `url` is empty), and
if `featured` is true add a `data-featured="true"` attribute (no new
styling system — just the attribute, so Plan 09's CSS/inline styles can
key off it if wanted). Leaf node.
`propertySchema`: `"string"` for title/description/url/tags, `"boolean"`
for featured.

### `builder/plugins/portfolio/skill-group.tsx`

Component `type: "SkillGroup"`, category `"Business"`.
Props: `category: string`, `items: string` (comma-separated, same
rationale as `tags` above). Renders `category` as an `<h4>` and `items`
as a `<ul>` of `<li>`s (split/trim on `,`, skip empty entries). Leaf
node. `propertySchema`: two `"string"` fields.

### `builder/plugins/portfolio/links-list.tsx`

Component `type: "LinksList"`, category `"Business"`.
Props: `github: string`, `linkedin: string`, `twitter: string`,
`website: string`, `email: string` (all default `""`). Renders a `<ul>`
of `<li><a>` entries, one per non-empty prop, with the `email` entry
using `href="mailto:{email}"` and the rest as plain `href={value}`.
Leaf node. `propertySchema`: five `"string"` fields, one per prop.

### `builder/plugins/portfolio/index.ts`

```ts
export * from "./profile-header";
export * from "./project-card";
export * from "./skill-group";
export * from "./links-list";

import type { ComponentRegistry } from "../../registry/types";
// import each definition
export function registerPortfolioComponents(registry: ComponentRegistry): void {
  registry.register(ProfileHeaderComponent);
  registry.register(ProjectCardComponent);
  registry.register(SkillGroupComponent);
  registry.register(LinksListComponent);
}
```

## Contract other plans depend on — do not rename without flagging it

Plan 08 (Document Adapter & Seed Templates) is being written in parallel
against these exact names. If you need to change a `type` string or a
prop key while implementing, call it out prominently in your final
report — don't just silently rename.

- `ProfileHeader`: `name`, `tagline`, `bio`, `location`
- `ProjectCard`: `title`, `description`, `url`, `tags`, `featured`
- `SkillGroup`: `category`, `items`
- `LinksList`: `github`, `linkedin`, `twitter`, `website`, `email`

## Non-goals

- No changes to `builder/components/*`, `builder/registry/*`, or
  `builder/renderer/*`.
- No app-level wiring (routes, actions, Prisma) — that's Plans 08–09.
- Don't delete or touch `lib/schema.ts`, `components/templates/*`, or
  `components/editor/*` — that's Plan 10, and only after Plan 09 is
  verified working.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- Smoke check: register all four components into a
  `createComponentRegistry()`, build a tiny document with one node of
  each type (`ProjectCard` with `tags: "react, typescript"`, `featured:
  true`; `SkillGroup` with `items: "Go, SQL, "` — confirm the trailing
  empty entry after the last comma is dropped, not rendered as a blank
  `<li>`), and confirm `createRenderer().renderPage(...)` produces an
  element tree without throwing.
- Every component's `propertySchema` entries correspond 1:1 to keys in
  `defaultProps`, matching the convention in `builder/components/*`.
