# ADR-010: Layout Intent Lives in Styles

## Status

Accepted (2026-08-08)

## Decision

**Styles win.** Layout intent for built-in layout components (`Stack`, `Grid`)
is expressed only in `node.styles`, not in parallel props.

- `Stack` layout (`display`, `flexDirection`, `gap`, `justifyContent`,
  `alignItems`, `flexWrap`) is authored in the Design panel.
- `Grid` layout (`display`, `gridTemplateColumns`, `gap`) is authored in
  the Design panel.
- Component definitions expose `resolveStyleDefaults(props)` as the single
  source of render-time defaults and Design-panel effective values.
- `layoutPropKeys` on a definition lists props that are migrated into
  `styles.base` and removed from `props` on create and on editor load.
- The Content tab shows only content props; layout props are removed from
  `propertySchema` for layout components.

## Rationale

Plan 26 identified that layout intent was split across props and styles.
`Stack.direction` and `flexDirection`, `Grid.columns` and
`gridTemplateColumns`, and `gap` on both sides meant the style spread
silently won in renderers while the Design panel showed blank controls.
Authors and the AI could not predict which control applied.

Styles as the single vocabulary aligns with ADR-001 (document is source of
truth), ADR-006 (AI emits the same primitives as human authors), and the
existing style engine. Layout is visual design; it belongs in the Design
panel alongside spacing, colour, and typography.

## Alternatives

- **Props win** — hide overlapping style fields in the Design panel for
  components that own layout. Smaller change, but keeps two vocabularies
  and will confuse again when shared styles (Plan 26 Stage 4) need to
  resolve what a style set contains.

## Consequences

- Existing documents are migrated idempotently on editor load via
  `migrateDocumentLayoutIntent`.
- AI create operations may still send legacy layout props; translate hoists
  them into `styles.base` before the node is created.
- Stage 4 (shared named styles) can treat a style set as a flat declaration
  without guessing whether layout lives in props or styles.

## Migration

Additive per ADR-008: layout props are copied to `styles.base` when absent,
then stripped from `props`. No `schemaVersion` bump. Unopened documents
migrate on first editor load and persist on next save.
