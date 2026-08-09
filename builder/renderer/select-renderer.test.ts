import { describe, expect, it } from "vitest";
import type { BuilderNode } from "../document/types";
import type { ComponentDefinition } from "../registry/types";
import { selectRenderer } from "./select-renderer";

function ServerRenderer() {
  return null;
}
function ClientRenderer() {
  return null;
}

function makeDefinition(
  overrides: Partial<ComponentDefinition> = {},
): ComponentDefinition {
  return {
    type: "Button",
    category: "Interaction",
    icon: () => null,
    renderer: ServerRenderer,
    defaultProps: {},
    propertySchema: [],
    constraints: {},
    ...overrides,
  };
}

function makeNode(events?: BuilderNode["events"]): BuilderNode {
  return {
    id: "n1",
    type: "Button",
    props: { label: "Go" },
    styles: {},
    children: [],
    ...(events ? { events } : {}),
  };
}

const clickEvents: BuilderNode["events"] = {
  onClick: [{ type: "notify", level: "success", message: "hi" }],
};

describe("selectRenderer", () => {
  it("uses the server renderer for a node with no events", () => {
    const result = selectRenderer(makeNode(), makeDefinition({ clientRenderer: ClientRenderer }), { label: "Go" }, true);

    expect(result.Component).toBe(ServerRenderer);
    expect(result.props.events).toBeUndefined();
  });

  it("uses the client renderer and forwards events when the node is interactive", () => {
    const definition = makeDefinition({ clientRenderer: ClientRenderer });
    const result = selectRenderer(makeNode(clickEvents), definition, { label: "Go" }, true);

    expect(result.Component).toBe(ClientRenderer);
    expect(result.props.events).toEqual(clickEvents);
  });

  it("never puts a function in the props bag", () => {
    // Functions cannot cross the server/client boundary in RSC. Handlers are
    // built inside the client renderer from `events`; if a handler ever gets
    // merged in here instead, published pages fail at runtime with
    // "Functions cannot be passed directly to Client Components".
    const definition = makeDefinition({ clientRenderer: ClientRenderer });
    const result = selectRenderer(makeNode(clickEvents), definition, { label: "Go" }, true);

    for (const value of Object.values(result.props)) {
      expect(typeof value).not.toBe("function");
    }
    expect(() => JSON.stringify(result.props)).not.toThrow();
  });

  it("falls back to the server renderer when the component has no client variant", () => {
    const result = selectRenderer(makeNode(clickEvents), makeDefinition(), { label: "Go" }, true);

    expect(result.Component).toBe(ServerRenderer);
    expect(result.props.events).toBeUndefined();
  });

  it("stays on the server renderer when the runtime is disabled", () => {
    const definition = makeDefinition({ clientRenderer: ClientRenderer });
    const result = selectRenderer(makeNode(clickEvents), definition, { label: "Go" }, false);

    expect(result.Component).toBe(ServerRenderer);
    expect(result.props.events).toBeUndefined();
  });
});
