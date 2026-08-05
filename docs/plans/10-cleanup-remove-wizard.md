# Plan 10 — Cleanup: Remove the Wizard

## Do this last, and only after Plan 09 is verified working

Do not start this plan until Plan 09's acceptance criteria have actually
been checked (editor loads, edits persist, publish renders on `/p/{slug}`)
— this plan deletes the fallback code path, so verify the replacement
works first. This is destructive; if there's any doubt whether Plan 09
actually landed cleanly, stop and ask rather than deleting.

## Objective

Remove the now-dead step-wizard editor and its fixed-shape content
model, once `builder/`-based editing (Plans 07–09) has fully replaced
it, so the codebase doesn't carry two parallel content models.

## Context

Read `builder/CONTRIBUTING.md` first (for orientation — this plan
mostly *removes* code rather than adding engine code).

By the time this plan runs, per Plan 09's scope, these should be unused:
- `components/editor/steps/BioStep.tsx`
- `components/editor/steps/ProjectsStep.tsx`
- `components/editor/steps/SkillsStep.tsx`
- `components/editor/steps/LinksStep.tsx`
- `components/editor/WizardShell.tsx`
- `components/editor/PreviewPane.tsx`
- `components/templates/ExecutiveTemplate.tsx`
- `components/templates/MinimalTemplate.tsx`
- `components/templates/index.ts`
- `lib/schema.ts`
- `lib/validations.ts`

## Deliverables

1. **Confirm nothing still imports the files above.** Run:
   ```
   grep -rn "lib/schema\|lib/validations\|components/templates\|editor/WizardShell\|editor/PreviewPane\|editor/steps" \
     app components lib --include="*.ts" --include="*.tsx"
   ```
   The only expected hits should be inside the files themselves and
   whatever `app/(dashboard)/new/page.tsx` still needs — check that file
   specifically: it imports `TEMPLATE_OPTIONS` from
   `components/templates` today just for the two template-choice cards
   on the "new portfolio" screen. If Plan 09 didn't already replace
   that usage, you have a decision to make (see step 2), not a delete
   to make blindly.

2. **`app/(dashboard)/new/page.tsx`**: it only needs template *names/
   descriptions/ids* for its picker UI (`"executive"`/`"minimal"` with a
   label and description), not the actual template React components.
   Move `TEMPLATE_OPTIONS` (just the plain data array, not the
   component registry) into `lib/builder/seed.ts` (Plan 08) or a small
   new `lib/builder/starter-templates.ts`, matching the two template
   ids `createDefaultDocument` already branches on. Update the import in
   `app/(dashboard)/new/page.tsx` accordingly. Do this *before* deleting
   `components/templates/*`, in the same pass — don't leave the app
   unbuildable between steps.

3. Delete the files listed above, once step 2 is done and nothing else
   references them.

4. **Prisma schema**: `Portfolio.templateId` stays (still used to pick
   a starter document per Plan 08/09) — do not remove it. No migration
   needed.

5. Grep for any remaining references to the old `PortfolioData` type,
   `parsePortfolioContent`, `defaultPortfolioData`, or
   `PortfolioDataSchema` across the repo and remove/update them.

6. Update `README.md` at the repo root if it mentions the wizard/step
   editor by name (check — don't assume).

## Non-goals

- Don't touch `builder/*`, `lib/builder/*`, or any of Plan 09's new
  editor components — this plan only removes the superseded code.
- Don't attempt a "soft deprecation" (feature flag, `@deprecated`
  comment, keeping the files but unused) — the whole point of this plan
  is a clean removal once the replacement is confirmed working; a
  half-removed state is worse than either full state.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` passes.
- `npm run build` succeeds.
- `npm run lint` passes (no unused-import warnings left behind from the
  deletions).
- The grep in step 1, re-run after cleanup, returns no hits outside
  files you intentionally kept (e.g. `lib/builder/starter-templates.ts`
  if that's where `TEMPLATE_OPTIONS`-equivalent data ended up).
- `app/(dashboard)/new/page.tsx` still renders its two template-choice
  cards correctly (manual check, or at minimum confirm the page compiles
  and the data it maps over has the same shape as before).
