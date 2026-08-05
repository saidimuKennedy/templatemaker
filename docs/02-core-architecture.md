# Core Architecture

## Overview

The system is composed of six major capabilities:

-   Document Engine
-   Canvas Engine
-   Rendering Engine
-   Component Registry
-   Style Engine
-   Publish Engine

## Data Flow

``` text
User Action
    ↓
Canvas Engine
    ↓
Document Engine
    ↓
Renderer
    ↓
Preview / Published Output
```

## Responsibilities

### Document Engine

Owns projects, pages, serialization and versioning.

### Canvas Engine

Owns selection, dragging, resizing and interaction.

### Rendering Engine

Transforms the document into React output.

### Component Registry

Discovers and registers available components.

### Style Engine

Applies design tokens and responsive styles.

### Publish Engine

Handles preview, publishing and export.
