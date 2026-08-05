# Component & Plugin Specification

## Component Contract

Every component provides:

-   type
-   category
-   icon
-   renderer
-   default props
-   editable property schema
-   parent constraints
-   child constraints

## Registration

``` text
registerComponent()
        ↓
Registry
        ↓
Toolbox
        ↓
Renderer
```

## Plugin Principles

Plugins must:

-   Register components only through the registry.
-   Avoid modifying engine internals.
-   Remain independently versionable.
