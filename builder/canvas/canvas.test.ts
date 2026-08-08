import { describe, expect, it } from "vitest";
import type { BuilderDocument, BuilderNode } from "../document/types";
import { createEditorSession } from "../history/session";
import {
  endDrag,
  beginDrag,
  initialCanvasState,
  resolveDropCommand,
  resolveKeyAction,
  resolveResizeCommand,
  select,
} from "./index";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

describe("canvas engine", () => {
  it("resolves drops, key actions, drag state, and resize commands", () => {
    const heading: BuilderNode = {
      id: "heading-1",
      type: "Heading",
      props: { text: "Hello" },
      styles: {},
      children: [],
    };

    const text: BuilderNode = {
      id: "text-1",
      type: "Text",
      props: { text: "World" },
      styles: {},
      children: [],
    };

    const section: BuilderNode = {
      id: "section-1",
      type: "Section",
      props: {},
      styles: {},
      children: [heading, text],
    };

    const pageId = "page-1";

    const document: BuilderDocument = {
      id: "proj-1",
      name: "Canvas Smoke",
      meta: {
        schemaVersion: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pages: [
        {
          id: pageId,
          name: "Home",
          path: "/",
          root: {
            id: "page-root",
            type: "Page",
            props: {},
            styles: {},
            children: [section],
          },
        },
      ],
    };

    // --- resolveDropCommand: reorder Text before Heading ---
    const moveCommand = resolveDropCommand(document, pageId, text.id, {
      nodeId: heading.id,
      position: "before",
    });

    assert(moveCommand !== undefined, "resolveDropCommand returns a command");
    if (!moveCommand) {
      throw new Error("unreachable");
    }
    assert(moveCommand.type === "MoveNode", "drop resolves to MoveNode");
    if (moveCommand.type !== "MoveNode") {
      throw new Error("unreachable");
    }
    assert(moveCommand.payload.newParentId === section.id, "newParentId is Section");
    assert(moveCommand.payload.newIndex === 0, "newIndex is 0 for before Heading");

    const session = createEditorSession(document);
    const result = session.execute(moveCommand);
    assert(result.ok, "MoveNode executes successfully");

    const reordered = session.getDocument().pages[0].root.children[0].children;
    assert(reordered[0].id === text.id, "Text is first child after reorder");
    assert(reordered[1].id === heading.id, "Heading is second child after reorder");

    // --- resolveDropCommand: same node returns undefined ---
    const selfDrop = resolveDropCommand(document, pageId, text.id, {
      nodeId: text.id,
      position: "before",
    });
    assert(selfDrop === undefined, "dropping on self returns undefined");

    // --- resolveKeyAction: undo vs redo ---
    assert(
      resolveKeyAction({ key: "z", metaKey: true, ctrlKey: false, shiftKey: false }) === "undo",
      "Cmd+Z maps to undo",
    );
    assert(
      resolveKeyAction({ key: "z", metaKey: true, ctrlKey: false, shiftKey: true }) === "redo",
      "Cmd+Shift+Z maps to redo",
    );
    assert(
      resolveKeyAction({ key: "z", metaKey: false, ctrlKey: true, shiftKey: false }) === "undo",
      "Ctrl+Z maps to undo",
    );
    assert(
      resolveKeyAction({ key: "z", metaKey: false, ctrlKey: true, shiftKey: true }) === "redo",
      "Ctrl+Shift+Z maps to redo",
    );

    // --- drag state transitions ---
    let state = initialCanvasState;
    state = beginDrag(state, text.id);
    assert(state.dragging?.nodeId === text.id, "beginDrag sets dragging node");
    assert(state.dropTarget === null, "beginDrag clears drop target");

    state = endDrag(state);
    assert(state.dragging === null, "endDrag clears dragging");
    assert(state.dropTarget === null, "endDrag clears drop target");

    // --- selection ---
    state = select(state, pageId, heading.id);
    assert(state.selection?.selectedNodeIds[0] === heading.id, "select sets selected node");

    // --- resize uses NodeStyleRules base breakpoint ---
    const resizeCommand = resolveResizeCommand(pageId, heading.id, "width", "100%");
    assert(resizeCommand.type === "UpdateStyles", "resize produces UpdateStyles");
    if (resizeCommand.type === "UpdateStyles") {
      assert(
        (resizeCommand.payload.styles as { base?: { width?: string } }).base?.width === "100%",
        "resize puts dimension under base breakpoint",
      );
    }
  });
});
