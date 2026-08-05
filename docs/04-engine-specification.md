# Engine Specification

## Responsibilities

The engine coordinates all editing operations.

Flow:

``` text
User Action
  ↓
Command
  ↓
Document Update
  ↓
Renderer
  ↓
Canvas Refresh
  ↓
History
```

## Capabilities

-   Selection
-   Drag and drop
-   Resize
-   Hover
-   Keyboard shortcuts
-   Undo / Redo
-   Clipboard operations

## Rules

-   All mutations go through commands.
-   The renderer is read-only.
-   The canvas never edits the document directly.
