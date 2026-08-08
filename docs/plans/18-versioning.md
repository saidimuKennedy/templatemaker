# Plan 18 — Versioning (auto-snapshot on publish + restore)

## Objective

`docs/02-core-architecture.md` assigns "serialization and **versioning**"
to the Document Engine, and the architecture spec §4 repeats it. Only
serialization was ever built. This adds version history.

**Confirmed decision:** snapshot automatically on every publish, with a
history list that can preview and restore a prior version. Not
per-save (too many rows), not user-named versions (too easy to forget).

Do this before Plans 19–20. Both AI generation and the animation system
make large, hard-to-eyeball changes to documents; having restore
available first is what makes those safe to experiment with.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented (read, do not modify):
- `builder/document/serialize.ts` — `serializeDocument`,
  `deserializeDocument` (validates on parse, throws `DocumentParseError`).
- `builder/document/types.ts` — `BuilderDocumentMeta.schemaVersion`
  (currently always `1`).
- `builder/publish/publish.ts` — `publish()` validates then renders;
  returns a `PublishRecord` with `publishedAt` and `schemaVersion`.
- `app/(dashboard)/editor/[id]/_actions.ts` — `publishPortfolio` is the
  single choke point where publishing happens. Snapshot there.
- `prisma/schema.prisma` — `Portfolio` model with `content Json`.

## Deliverables

### 1. Prisma model

```prisma
model PortfolioVersion {
  id            String   @id
  portfolioId   String
  content       Json
  schemaVersion Int
  label         String?
  createdAt     DateTime @default(now())
  portfolio     Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)

  @@index([portfolioId, createdAt])
}
```
Add the back-relation `versions PortfolioVersion[]` to `Portfolio`.

This needs a real migration (`npx prisma migrate dev --name add_portfolio_versions`).
**Note:** the dev database has been intermittently unreachable from
some environments. If `migrate dev` fails to connect, do not fake it or
hand-edit the migrations folder — report the failure and stop.

### 2. Snapshot on publish

In `publishPortfolio` (`app/(dashboard)/editor/[id]/_actions.ts`), after
`publish()` returns `ok: true` and before/alongside the
`prisma.portfolio.update`, insert a `PortfolioVersion` row with the
document being published and its `meta.schemaVersion`.

Wrap the version insert and the portfolio update in a single
`prisma.$transaction` — a snapshot that exists for a publish that
didn't happen (or vice versa) is worse than no snapshot.

Do **not** snapshot on `saveDocument`. Do **not** snapshot when
`publish()` returns validation errors.

### 3. Retention

Unbounded snapshots will grow without limit on a `Json` column. After
inserting, delete all but the most recent **20** versions for that
portfolio, inside the same transaction. Put the constant in
`lib/builder/versions.ts` as an exported `MAX_VERSIONS_PER_PORTFOLIO`
so it's discoverable, not buried.

### 4. Server actions — `lib/builder/versions.ts` + editor actions

```ts
listVersions(portfolioId): Promise<VersionSummary[]>   // id, createdAt, schemaVersion
getVersion(portfolioId, versionId): Promise<BuilderDocument | undefined>
restoreVersion(portfolioId, versionId): Promise<{ success: boolean; errors?: ValidationError[] }>
```
All must go through the same ownership check the existing actions use
(`requireOwnedPortfolio`) — a user must not be able to read or restore
another user's versions. This is the security-sensitive part of the
plan; do not skip it.

`restoreVersion` must:
1. Load the snapshot, `parseBuilderContent` it, and re-run
   `validatePortfolioDocument` against a fresh registry — an old
   snapshot may reference a component type that no longer exists, or
   was authored under a different `schemaVersion`. Return the errors
   rather than writing an invalid document.
2. **Snapshot the current document first**, then overwrite
   `Portfolio.content`. Restoring must itself be undoable; silently
   discarding the user's current work is unacceptable.

### 5. History UI

A "History" control in the editor toolbar opening a panel/dialog
(`components/ui/dialog.tsx` exists) listing versions newest-first with
their timestamp. Each row: **Preview** (loads that document read-only
into the canvas without saving) and **Restore** (confirm first, then
call `restoreVersion`, then reload the editor with the restored
document).

Restore is destructive-ish and user-facing: require an explicit
confirmation step, and toast the outcome.

## Non-goals

- No diffing between versions.
- No branching, no per-node history (the Command/History engine already
  covers in-session undo; this is coarse-grained document history).
- No schema migration framework for old `schemaVersion` documents —
  detect and report a mismatch, don't attempt to upgrade.

## Acceptance criteria

- `npx tsc --noEmit`, `npm run build`, `npm run lint`, `npm test` clean.
- Publishing twice creates exactly two version rows; saving without
  publishing creates none.
- Restoring an older version changes the live document **and** leaves a
  new snapshot of what was replaced (verify row count and content).
- A version belonging to another user's portfolio cannot be listed,
  fetched, or restored — test this explicitly, don't assume.
- Publishing 21+ times leaves exactly 20 rows for that portfolio.
