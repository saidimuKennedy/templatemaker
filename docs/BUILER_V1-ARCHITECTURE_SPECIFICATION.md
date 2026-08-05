
# Builder v1 Architecture Specification

## 1. Vision

Builder is a visual composition platform for creating responsive, production-ready web experiences without writing code.

The primary target is **mobile-first webviews** embedded in messaging platforms such as WhatsApp. The same engine should also render landing pages, event pages, customer portals, surveys, dashboards, and CRM views.

The editor should never contain knowledge of specific business domains. Instead, it operates on a generic page model and delegates rendering to registered components.

---

## 2. Design Principles

Every architectural decision should satisfy these principles.

### Engine First

The editor knows how to compose pages.

It does **not** know what a Hero, Product Card, or Survey Question is.

Those are plugins.

---

### JSON is the Source of Truth

Every page is represented by a serializable document.

No visual state exists outside this document.

```
Canvas

↓

JSON

↓

Renderer

↓

Published Page
```

---

### Everything is a Node

Every element in the builder is a node.

```
Page

Section

Container

Text

Image

Button

Grid

Form

Timeline
```

Even custom components follow the same contract.

---

### Renderer Agnostic

The editor never renders HTML directly.

Instead:

```
JSON

↓

Renderer

↓

React

↓

HTML
```

Tomorrow the same JSON could render to another target without changing the editor.

---

### Plugin Based

Adding a new component should never require changing editor code.

A component registers itself with the registry.

The builder automatically exposes it.

---

## 3. Core Architecture

```
                  Builder
                     │
          ┌──────────┴──────────┐
          │                     │
     Editor Engine        Renderer Engine
          │                     │
          └──────────┬──────────┘
                     │
                Page Tree
                     │
         ┌───────────┼────────────┐
         │           │            │
   WhatsApp     Landing Page     CRM
```

The Page Tree is the center of the system.

Everything reads or writes it.

---

## 4. Major Systems

The engine consists of independent systems.

### Document Engine

Responsible for:

* project
* pages
* page tree
* serialization
* versioning

---

### Component Registry

Responsible for:

* available components
* categories
* metadata
* property definitions
* constraints

Example:

```
registerComponent({
    type: "Hero",
    category: "Marketing",
    icon: HeroIcon,
    props: ...
})
```

---

### Rendering Engine

Receives a page tree.

Produces React.

Nothing else.

---

### Canvas Engine

Responsible for:

* selection
* dragging
* resizing
* snapping
* hover
* drop targets
* keyboard navigation

It never knows what component is being manipulated.

---

### Property Engine

Given a selected node:

```
Button

↓

Property Schema

↓

Generate Inspector UI
```

The inspector is data-driven.

---

### Style Engine

Stores styles separately from rendering.

Responsible for:

* spacing
* colors
* typography
* responsive rules
* design tokens

---

### History Engine

Every modification becomes a command.

```
Move Node

Update Prop

Delete

Duplicate

Resize
```

Undo and redo replay commands.

---

### Publish Engine

Responsible for:

* preview
* production
* export
* embedded mode

---

## 5. Page Model

Every page is a tree.

```
Page

└── Hero

└── Section

    ├── Heading

    ├── Text

    └── Button
```

Every node contains:

```
id

type

props

styles

children
```

Nothing more.

---

## 6. Component Contract

Every component must define:

* renderer
* icon
* category
* default props
* editable props
* allowed parents
* allowed children

The editor learns about components from these definitions.

---

## 7. State Flow

```
User Action

↓

Command

↓

Document Update

↓

History

↓

Renderer

↓

Canvas Update
```

The renderer never mutates state.

---

## 8. Rendering Targets

Version 1 supports:

* Editor Preview
* Published Webview
* Embedded CRM View

Future targets:

* Static Export
* Next.js Export
* Email-safe Renderer (subset)
* PDF Renderer (subset)

---

## 9. Component Categories

Instead of dozens of unrelated blocks, organize them into libraries:

**Layout**

* Page
* Section
* Container
* Grid
* Stack
* Columns

**Content**

* Heading
* Text
* Image
* Video
* Icon

**Interaction**

* Button
* Form
* Input
* Select
* Checkbox

**Business**

* Product Card
* Pricing
* Event Card
* Speaker
* Ticket
* Timeline
* Survey Question

**Navigation**

* Navbar
* Tabs
* Breadcrumb
* Footer

---

## 10. What Version 1 Will Not Include

To keep the scope realistic, explicitly exclude:

* Real-time collaboration
* AI page generation
* Marketplace
* Plugin marketplace
* Animation timeline
* Custom code injection
* Full CMS
* Complex workflow automation

Those can come after the core engine is stable.

---

This architecture also changes how you should think about the repository. Instead of organizing it around routes like `editor`, `templates`, or `steps`, organize it around **capabilities**:

```
builder/
├── document/
├── renderer/
├── canvas/
├── registry/
├── inspector/
├── history/
├── styles/
├── publish/
├── components/
└── plugins/
```

Everything else—CRM screens, portfolio builders, event pages, or WhatsApp webviews—becomes an application that *uses* this engine rather than being embedded inside it.

