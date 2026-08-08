# Plan 16 — Test Harness

## Objective

Every check across Plans 01–15 was an ad-hoc `smoke.ts` script, compiled
with a hand-written throwaway tsconfig and run with `node`. They caught
real bugs — but nothing runs them automatically, they can silently rot,
and `npm test` doesn't exist. Before declaring v1 done, the existing
verification needs to be a real, runnable suite.

This plan does **not** write new test cases. It migrates the assertions
that already exist into a runner and makes them a single command.

## Context

Read `builder/CONTRIBUTING.md` first.

Existing smoke scripts to migrate (each is a top-level script that
throws on failure and `console.log`s on success):
- `builder/components/smoke.ts` — Navbar/Grid/Stack layout + seed
  regression
- `builder/styles/smoke.ts` — `resolveNodeStyle` cascade,
  `createStyledRenderer`
- `builder/styles/smoke-fields.ts` — built-in components apply
  `props.style`
- `builder/styles/smoke-responsive.ts` — `@media` generation + CSS
  injection sanitisation
- `builder/inspector/smoke.ts` — inspector model + command round-trip
- `builder/publish/smoke.ts` — publish/preview/embed outcomes
- `builder/canvas/smoke.ts` — drop resolution, key actions, drag state
- `builder/plugins/portfolio/smoke.ts` — business component rendering
- `lib/builder/smoke.ts` — seed templates, parse/validate round-trip

Note several of these render React to HTML via
`react-dom/server`'s `renderToStaticMarkup` — the runner must handle
`.tsx` and JSX.

## Deliverables

### 1. Add Vitest

Add `vitest` (and `@vitejs/plugin-react` if needed for JSX) as
devDependencies. This is a new dependency — call it out explicitly in
your final report per the repo rules.

Add `vitest.config.ts` configured so that:
- The `@/*` path alias resolves the same way `tsconfig.json` defines it
  (`@/*` → repo root). Several smoke files import via `@/…`; without
  this they won't resolve. Use `vite-tsconfig-paths` or an explicit
  `resolve.alias`.
- `environment: "node"` (nothing under test needs a DOM;
  `renderToStaticMarkup` is server-side).
- `include` covers `**/*.test.ts(x)`.

Add scripts to `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### 2. Convert each smoke script to a test file

Rename `X/smoke.ts` → `X/<name>.test.ts` (`.tsx` where it contains
JSX). Convert the top-level script body into `describe`/`it` blocks and
replace the hand-rolled `assert(cond, msg)` helper with Vitest's
`expect`. **Preserve every existing assertion** — do not drop or weaken
any, they encode real regressions found during this build (e.g. the
`SkillGroup` trailing-empty-entry case, the CSS-injection sanitiser, the
seed-document `justify`/`align` fallback).

Delete the old `smoke.ts` files once converted.

Two scripts are **not** tests and must not be converted — they are
one-off dev utilities that hit the network/database:
- `builder/dogfood.tsx` (writes an HTML file)
- `builder/seed-dogfood-portfolio.tsx` (writes to Prisma)

Move both to a `scripts/` directory at the repo root so they're clearly
not part of the suite, and make sure `vitest`'s `include` never picks
them up.

### 3. Guard against DB-dependent tests

`lib/builder/smoke.ts` imports from `lib/builder/*`, which pulls in
`@prisma/client` via `content.tsx`. The database is **intermittently
unreachable from this environment** (observed repeatedly: a query fails,
then succeeds seconds later unchanged). Tests must not depend on it.

Verify the converted `lib/builder` tests exercise only pure functions
(`createDefaultDocument`, `parseBuilderContent`, `validatePortfolioDocument`,
`renderPublished`) and never open a Prisma connection. If importing the
barrel pulls Prisma in as a side effect, import the specific modules
directly instead.

### 4. CI-ready

`npm test` must pass from a clean checkout with **no** database, no dev
server, and no network. State in your report whether that holds.

## Non-goals

- No new test cases beyond what the smoke scripts already assert.
- No React component / DOM testing (`@testing-library/react`), no E2E
  (Playwright). The editor UI stays manually verified for now — say so
  in your report as a known gap.
- No coverage thresholds or CI workflow file.

## Acceptance criteria

- `npm test` runs every migrated suite and passes, with **no** database
  reachable (prove it — e.g. run with `DATABASE_URL` unset or pointed at
  a dead host).
- The number of assertions is greater than or equal to what the smoke
  scripts had; explicitly confirm none were dropped.
- `npx tsc --noEmit`, `npm run build`, `npm run lint` still clean.
- No `smoke.ts` files remain under `builder/` or `lib/`; `dogfood.tsx`
  and `seed-dogfood-portfolio.tsx` live under `scripts/`.
