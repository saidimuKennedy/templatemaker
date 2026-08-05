# Document Model

## Core Objects

``` text
Project
 └── Pages
      └── Node Tree
```

## Node Contract

Every node contains:

-   id
-   type
-   props
-   styles
-   children

## Example

``` json
{
  "id": "hero-1",
  "type": "Hero",
  "props": {
    "title": "Welcome"
  },
  "styles": {},
  "children": []
}
```

## Rules

-   IDs are unique within a project.
-   The document is the single source of truth.
-   Parent-child relationships form a tree.
-   Nodes are serializable.
-   Components never mutate the document directly; all changes go
    through the engine.
