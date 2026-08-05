# Builder Engine — Parallel Work Plans

This directory splits the remaining engine build (see
`docs/06-development-roadmap.md`) into self-contained plans that
different agents can execute concurrently. **All agents work directly in
this same working tree — no isolated worktrees or branches.** The plans
are split by directory specifically so concurrent edits don't collide;
do not `git worktree` per plan.

Every agent must read `builder/CONTRIBUTING.md` before writing code. It
is short and non-negotiable.

## Current state (already implemented — do not redo)

```
builder/
├── CONTRIBUTING.md                  done
├── index.ts                         done (top-level barrel, may need small updates)
├── document/
│   ├── types.ts                     done — BuilderNode, BuilderPage, BuilderProject,
│   │                                        BuilderDocument, NodeId, PageId, NodeProps,
│   │                                        NodeStyles, ValidationResult, ValidationError
│   ├── tree.ts                      done — findNodeAndParent, removeNode, insertNode, updateNode
│   ├── id.ts                        done — generateNodeId, generatePageId (nanoid)
│   ├── validate.ts                  done — validateDocumentStructure, validateAgainstRegistry
│   ├── serialize.ts                 done — serializeDocument, deserializeDocument, DocumentParseError
│   └── index.ts                     done (barrel)
├── registry/
│   ├── types.ts                     done — ComponentDefinition, ComponentRegistry, PropertySchema,
│   │                                        PropertyField, NodeConstraints, ComponentCategory,
│   │                                        ComponentRenderer
│   ├── registry.ts                  done — createComponentRegistry()
│   └── index.ts                     done (barrel)
├── renderer/
│   ├── types.ts                     done — Renderer, RenderContext, RenderTarget
│   ├── renderer.tsx                 done — createRenderer()
│   └── index.ts                     done (barrel)
├── history/
│   ├── types.ts                     done — Command (CreateNode/MoveNode/DeleteNode/
│   │                                        UpdateProps/UpdateStyles), CommandEngine, History
│   ├── commands.ts                  done — createCommandEngine() (apply + invert)
│   ├── history.ts                   NOT DONE — see Plan 01
│   ├── session.ts                   NOT DONE — see Plan 01
│   └── index.ts                     NOT DONE — see Plan 01
├── plugins/
│   ├── types.ts                     done — Plugin, PluginContext
│   └── index.ts                     NOT DONE — see Plan 01
├── ai/
│   ├── types.ts                     done — AIProvider, AIGenerateRequest, AIGenerateResult
│   └── index.ts                     NOT DONE — see Plan 01
├── components/                      empty — see Plan 02
├── styles/                          empty — see Plan 03
├── inspector/                       empty — see Plan 04
├── publish/                         empty — see Plan 05
└── canvas/                          empty — see Plan 06 (do last)
```

Repo context: Next.js 16 / React 19 / TypeScript strict app at the repo
root. `nanoid` and `zod` are already dependencies — reuse them, don't add
new state/tree/schema libraries. No test runner (vitest/jest) is
configured; verify work with `npx tsc --noEmit -p tsconfig.json` from
the repo root plus a small ad-hoc smoke script if useful (see each
plan's Acceptance Criteria).

## Plans and dependency order

| # | Plan | Directory | Depends on | Can run in parallel with |
|---|------|-----------|------------|---------------------------|
| 01 | [Finish Engine Core](./01-finish-engine-core.md) | `builder/history/`, `builder/plugins/`, `builder/ai/`, `builder/index.ts` | nothing (do first) | — |
| 02 | [Built-in Components](./02-built-in-components.md) | `builder/components/` | 01 (or just `registry`/`renderer`, already done) | 03, 04, 05 |
| 03 | [Style Engine](./03-style-engine.md) | `builder/styles/` | 01 | 02, 04, 05 |
| 04 | [Inspector / Property Engine](./04-inspector-property-engine.md) | `builder/inspector/` | 01 | 02, 03, 05 |
| 05 | [Publish Engine](./05-publish-engine.md) | `builder/publish/` | 01 | 02, 03, 04 |
| 06 | [Canvas Engine](./06-canvas-engine.md) | `builder/canvas/` | 01, 02, 03 | do last, after those land |

Plan 01 is small (finishing History + barrels) and should land first so
`builder/index.ts` exports cleanly — but plans 02–05 only actually need
the *already-done* `document/`, `registry/`, and `renderer/` modules, so
they can start immediately in parallel with 01 if you want maximum
throughput; just don't touch `builder/history/`, `builder/plugins/`, or
`builder/ai/`. Plan 06 (Canvas) is the one true "do last" — it is the
one place the roadmap explicitly warns against starting early, and it
needs 02 and 03 (components + styles) to have something real to select
and drag.

## Rules that apply to every plan

1. Follow `builder/CONTRIBUTING.md` — commands only, no direct document
   mutation, renderer stays read-only, no business-specific components
   inside `builder/` core.
2. Touch only the files/directories your plan lists. If you find a bug
   in a file owned by another plan, note it in your final report instead
   of fixing it — avoids collisions on a shared tree.
3. Out of scope for all of v1 (per `docs/01-vision-and-product-principles.md`):
   real-time collaboration, AI generation UI, a plugin marketplace, a
   full CMS, animation timelines. Don't build toward these.
4. No new runtime dependencies without calling it out explicitly in your
   final report — prefer what's already in `package.json`.
5. Verify with `npx tsc --noEmit -p tsconfig.json` from the repo root
   before reporting done. Fix every new error your change introduces.
