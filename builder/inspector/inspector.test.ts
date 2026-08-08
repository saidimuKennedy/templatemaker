import { describe, expect, it } from "vitest";
import type { BuilderDocument, BuilderNode } from "../document/types";
import { serializeDocument, deserializeDocument } from "../document/serialize";
import { validateDocumentStructure } from "../document/validate";
import { createCommandEngine } from "../history/commands";
import { createEditorSession } from "../history/session";
import { createComponentRegistry } from "../registry/registry";
import type { ComponentDefinition } from "../registry/types";
import {
  buildInspectorModel,
  createRenameNodeCommand,
  createUpdatePropsCommand,
  validateFieldValue,
} from "./index";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

describe("inspector / property engine", () => {
  it("builds a model reflecting node values and falling back to defaults", () => {
    const TestRenderer = () => null;
    const testDefinition: ComponentDefinition = {
      type: "SmokeWidget",
      category: "Content",
      icon: TestRenderer,
      renderer: TestRenderer,
      defaultProps: { title: "Default title", size: "md" },
      propertySchema: [
        { key: "title", label: "Title", type: "string", defaultValue: "Default title" },
        {
          key: "size",
          label: "Size",
          type: "select",
          defaultValue: "md",
          options: [
            { label: "Small", value: "sm" },
            { label: "Medium", value: "md" },
          ],
        },
      ],
      constraints: {},
    };

    const node: BuilderNode = {
      id: "node-1",
      type: "SmokeWidget",
      props: { title: "Custom title" },
      styles: {},
      children: [],
    };

    const registry = createComponentRegistry();
    registry.register(testDefinition);

    const model = buildInspectorModel(node, registry);
    assert(model !== undefined, "buildInspectorModel returns a model");

    const titleField = model!.fields.find((field) => field.key === "title");
    const sizeField = model!.fields.find((field) => field.key === "size");

    assert(titleField?.value === "Custom title", "present prop reflects node value");
    assert(sizeField?.value === "md", "omitted prop falls back to defaultValue");

    const selectField = testDefinition.propertySchema[1]!;
    assert(validateFieldValue(selectField, "sm") === undefined, "validateFieldValue accepts in-range select value");
    assert(
      validateFieldValue(selectField, "xl") !== undefined,
      "validateFieldValue rejects out-of-range select value",
    );

    const missingTypeModel = buildInspectorModel({ ...node, type: "UnknownType" }, registry);
    assert(missingTypeModel === undefined, "unknown component type returns undefined");
  });

  it("createUpdatePropsCommand round-trips through the command engine, touching only the targeted prop", () => {
    const node: BuilderNode = {
      id: "node-1",
      type: "SmokeWidget",
      props: { title: "Custom title" },
      styles: {},
      children: [],
    };

    const document: BuilderDocument = {
      id: "proj-1",
      name: "Smoke",
      meta: {
        schemaVersion: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pages: [
        {
          id: "page-1",
          name: "Home",
          path: "/",
          root: { id: "root", type: "Page", props: {}, styles: {}, children: [node] },
        },
      ],
    };

    const engine = createCommandEngine();
    const command = createUpdatePropsCommand(document.pages[0].id, node, "title", "Updated");
    const result = engine.apply(document, command);

    assert(result.ok, "UpdateProps command applies successfully");

    const updatedNode = result.ok ? result.result.document.pages[0].root.children[0] : undefined;

    assert(updatedNode?.props.title === "Updated", "targeted prop updated");
    assert(updatedNode?.props.size === undefined, "sibling props untouched");
  });

  it("RenameNode applies, inverts to previous name, and round-trips serialization", () => {
    const namedNode: BuilderNode = {
      id: "node-named",
      type: "Heading",
      name: "Hero Title",
      props: { text: "Hello" },
      styles: {},
      children: [],
    };

    const unnamedNode: BuilderNode = {
      id: "node-unnamed",
      type: "Text",
      props: { text: "World" },
      styles: {},
      children: [],
    };

    const document: BuilderDocument = {
      id: "proj-1",
      name: "Rename Smoke",
      meta: {
        schemaVersion: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pages: [
        {
          id: "page-1",
          name: "Home",
          path: "/",
          root: {
            id: "root",
            type: "Page",
            props: {},
            styles: {},
            children: [namedNode, unnamedNode],
          },
        },
      ],
    };

    const engine = createCommandEngine();
    const pageId = document.pages[0].id;

    const renameCommand = createRenameNodeCommand(pageId, namedNode, "Updated Title");
    const inverse = engine.invert(document, renameCommand);
    assert(inverse.type === "RenameNode", "invert produces RenameNode");
    if (inverse.type !== "RenameNode") {
      throw new Error("unreachable");
    }
    assert(inverse.payload.name === "Hero Title", "invert captures previous name");

    const applyResult = engine.apply(document, renameCommand);
    assert(applyResult.ok, "RenameNode applies successfully");
    if (!applyResult.ok) {
      throw new Error("unreachable");
    }

    const renamed = applyResult.result.document.pages[0].root.children[0];
    assert(renamed.name === "Updated Title", "name updated after apply");

    const undoResult = engine.apply(applyResult.result.document, inverse);
    assert(undoResult.ok, "inverse applies successfully");
    if (!undoResult.ok) {
      throw new Error("unreachable");
    }
    const restored = undoResult.result.document.pages[0].root.children[0];
    assert(restored.name === "Hero Title", "inverse restores previous name");

    const renameUnnamed = createRenameNodeCommand(pageId, unnamedNode, "Body Copy");
    const inverseUnnamed = engine.invert(document, renameUnnamed);
    assert(inverseUnnamed.type === "RenameNode", "invert unnamed produces RenameNode");
    if (inverseUnnamed.type !== "RenameNode") {
      throw new Error("unreachable");
    }
    assert(inverseUnnamed.payload.name === undefined, "invert captures undefined for unnamed node");

    const applyUnnamed = engine.apply(document, renameUnnamed);
    assert(applyUnnamed.ok, "rename unnamed applies");
    if (!applyUnnamed.ok) {
      throw new Error("unreachable");
    }

    const undoUnnamed = engine.apply(applyUnnamed.result.document, inverseUnnamed);
    assert(undoUnnamed.ok, "undo unnamed rename applies");
    if (!undoUnnamed.ok) {
      throw new Error("unreachable");
    }
    const restoredUnnamed = undoUnnamed.result.document.pages[0].root.children[1];
    assert(restoredUnnamed.name === undefined, "undo restores undefined name, not empty string");

    const clearName = createRenameNodeCommand(pageId, namedNode, "   ");
    const applyClear = engine.apply(document, clearName);
    assert(applyClear.ok, "whitespace-only rename applies");
    if (!applyClear.ok) {
      throw new Error("unreachable");
    }
    const cleared = applyClear.result.document.pages[0].root.children[0];
    assert(cleared.name === undefined, "whitespace-only input normalises to undefined");
    assert(!("name" in cleared) || cleared.name === undefined, "name is not empty string");

    const session = createEditorSession(applyClear.result.document);
    session.execute(createRenameNodeCommand(pageId, { ...namedNode, name: "Persist Me" }, "Persist Me"));
    const serialized = serializeDocument(session.getDocument());
    const deserialized = deserializeDocument(serialized);
    const validation = validateDocumentStructure(deserialized);
    assert(validation.valid, "renamed document passes validateDocumentStructure");

    const persisted = deserialized.pages[0].root.children[0];
    assert(persisted.name === "Persist Me", "name survives serialize → deserialize");
  });
});
