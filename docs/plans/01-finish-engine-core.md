# Plan 01 — Finish Engine Core (History + barrels)

## Objective

Close the one gap left in the engine's foundational layer so every
other plan can import a complete `builder/` public surface. Small,
mechanical, do this first.

## Context

Read `builder/CONTRIBUTING.md` first.

Already implemented and working (do not modify):
- `builder/document/*` — full Document Model (types, tree ops, id gen,
  validation, serialization).
- `builder/registry/*` — Component Registry.
- `builder/renderer/*` — Renderer.
- `builder/history/types.ts` — the `Command` union, `CommandEngine`, and
  `History` interfaces.
- `builder/history/commands.ts` — `createCommandEngine()`, a full,
  working implementation of `apply()`/`invert()` for all five command
  types (CreateNode, MoveNode, DeleteNode, UpdateProps, UpdateStyles).
  Read this file fully before starting; you're building the piece that
  sits on top of it.

Missing:
- `builder/history/history.ts` — a concrete `History` implementation.
- `builder/history/session.ts` — a small orchestrator that ties
  `CommandEngine` + `History` + the current document together into one
  ergonomic session object.
- `builder/history/index.ts` — barrel export.
- `builder/plugins/index.ts` — barrel export (types.ts already exists).
- `builder/ai/index.ts` — barrel export (types.ts already exists).
- `builder/index.ts` — currently only re-exports each subsystem's
  `types.ts` (see the file — it has 6 `export * from "./X/types"`
  lines). Replace those with `export * from "./document"`,
  `"./registry"`, `"./renderer"`, `"./history"`, `"./plugins"`,
  `"./ai"` once each subsystem has a proper `index.ts`, so implementations
  are exported too, not just types.

## Deliverables

### `builder/history/history.ts`

A `BuilderHistory` class implementing the `History` interface from
`./types.ts`. The interface's `push(command: Command): void` is
underspecified for real undo — undo needs the *inverse* command, not
just the forward one. Resolve this the way the codebase already leans:
give the concrete class an additional optional parameter, which is
still structurally assignable to `History`:

```ts
class BuilderHistory implements History {
  push(command: Command, inverse?: Command): void { ... }
  ...
}
```

Internally keep two stacks of `{ command, inverse }` entries (undo
stack, redo stack):
- `push(command, inverse)`: throw if `inverse` is omitted (document why
  in a one-line comment — this class is only ever driven by
  `session.ts`, which always supplies both); pushes onto the undo stack
  and clears the redo stack.
- `undo()`: pop the undo stack, push that entry onto the redo stack,
  return `entry.inverse` (the command the caller must now *apply* to
  actually undo).
- `redo()`: pop the redo stack, push it back onto the undo stack, return
  `entry.command`.
- `canUndo()` / `canRedo()`: stack non-empty checks.
- `clear()`: empty both stacks.

Export a factory `createHistory(): History` as well as the class itself
(session.ts needs the class to call the two-arg `push`; other callers
should generally use the factory and the plain `History` type).

### `builder/history/session.ts`

```ts
export interface EditorSession {
  getDocument(): BuilderDocument;
  execute(command: Command): CommandApplyResult;
  undo(): BuilderDocument | undefined;
  redo(): BuilderDocument | undefined;
  readonly history: History;
}

export function createEditorSession(
  initialDocument: BuilderDocument,
  commandEngine?: CommandEngine,
  history?: BuilderHistory,
): EditorSession
```

Behavior:
- `execute(command)`: compute `commandEngine.invert(document, command)`
  against the **current** document, then `commandEngine.apply(document,
  command)`. If the result is `ok`, update the held document and call
  `history.push(command, inverse)`. Always return the `CommandApplyResult`
  (including failures) to the caller — don't swallow errors.
- `undo()`: `history.undo()` returns an inverse `Command` or `undefined`.
  If defined, apply it via `commandEngine.apply(document, inverseCommand)`;
  on failure throw (an invertible command failing to apply means a bug,
  not a normal error path); on success update and return the new
  document.
- `redo()`: mirror `undo()` using `history.redo()`.
- Default the two optional constructor args to `createCommandEngine()`
  and `new BuilderHistory()` respectively so `createEditorSession(doc)`
  works standalone.

### `builder/history/index.ts`

```ts
export * from "./types";
export * from "./commands";
export * from "./history";
export * from "./session";
```

### `builder/plugins/index.ts` and `builder/ai/index.ts`

Each just `export * from "./types";` for now (no implementations exist
yet in those subsystems — that's fine, other plans don't depend on
implementations there).

### `builder/index.ts`

Replace the six `export * from "./X/types"` lines with six
`export * from "./X"` lines (one per subsystem: document, registry,
renderer, history, plugins, ai), pointing at each subsystem's own
barrel instead of reaching into `types.ts` directly.

## Acceptance criteria

- `npx tsc --noEmit -p tsconfig.json` from the repo root passes with no
  errors.
- A manual smoke check (write a throwaway `.ts` file under the
  scratchpad, or reason through it carefully) confirms:
  1. `createEditorSession` on a minimal one-page document can
     `execute` a `CreateNode`, then `undo()` returns a document equal to
     the original, then `redo()` returns a document equal to the one
     after the create.
  2. `execute` with a command targeting a nonexistent node returns
     `{ ok: false, ... }` and does **not** push anything onto history
     (`canUndo()` stays false).
- No changes to any file outside `builder/history/`, `builder/plugins/`,
  `builder/ai/`, and `builder/index.ts`.
