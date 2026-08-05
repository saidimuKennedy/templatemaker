# Contributing to the Builder Engine

These rules are non-negotiable. They exist to keep the engine coherent as
multiple people (and coding agents) implement it independently against the
same contracts. See `docs/` at the repo root for the full architecture,
document model, engine spec, component/plugin spec, roadmap, and ADRs.

1. **The document model is the single source of truth.**
   No visual or editing state may live outside a `BuilderDocument`. If it
   can't be serialized, it doesn't belong in the engine.

2. **No component mutates state directly.**
   Components render from props derived from the document. They never
   write to the document, the registry, or history directly.

3. **All edits go through commands.**
   Every mutation — create, move, delete, update props, update styles —
   is expressed as a `Command` and applied by the engine. This is what
   makes undo/redo, validation, and AI editing possible for free.

4. **New components register through the registry.**
   Components are never hardcoded into the editor, canvas, or renderer.
   They call `registerComponent()` and expose a `ComponentDefinition`.

5. **The engine never imports business-specific components.**
   `builder/` knows about nodes, trees, commands, and renderers. It does
   not know what a Hero, Product Card, or Survey Question is. Those live
   in `builder/plugins/` or an application that consumes the engine.

6. **AI integrations use the provider abstraction only.**
   AI features talk to an `AIProvider`, never a specific vendor SDK
   directly. The engine and the AI provider both speak `Command`s and
   `BuilderDocument`s — never HTML, JSX, or vendor-specific output.

7. **Renderers never modify documents.**
   A `Renderer` is a pure function of a document (and viewport/target) to
   output. Rendering must never trigger a command or otherwise write back
   to the document.

## Directory layout

```
builder/
├── document/     Document Model: types, validation, serialization
├── registry/      Component Registry: register/load/discover components
├── renderer/      Renderer: document -> React, read-only
├── canvas/        Canvas Engine: selection, drag, resize (consumes commands)
├── history/       Command application, undo/redo
├── inspector/      Property Engine: schema -> inspector UI
├── styles/        Style Engine: tokens, responsive styles
├── publish/       Publish Engine: preview, publish, export
├── components/    Built-in component plugins (Layout/Content/etc.)
├── plugins/       Plugin contract + third-party/business component plugins
└── ai/            AIProvider abstraction (ADR-005, ADR-006)
```

## Build order

Follow the roadmap in `docs/06-development-roadmap.md`. In particular,
do not start the Canvas (drag/drop/selection UI) before the Document
Model, Registry, Renderer, Command API, and History are implemented and
tested. The editor should end up as a thin layer over a working engine,
not the other way around.
