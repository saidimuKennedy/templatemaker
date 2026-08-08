import { describe, expect, it } from "vitest";
import type { BuilderDocument, BuilderNode } from "../document/types";
import { createCommandEngine } from "../history/commands";
import { createComponentRegistry } from "../registry/registry";
import type { ComponentDefinition } from "../registry/types";
import {
  buildInspectorModel,
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
});
