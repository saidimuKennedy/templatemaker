import { describe, expect, it } from "vitest";
import type { BuilderNode } from "../document/types";
import { createComponentRegistry } from "../registry/registry";
import { registerBuiltInComponents } from "../components";
import { resolveEffectiveStyleField } from "./effective";

function gridNode(styles: BuilderNode["styles"] = {}): BuilderNode {
  return {
    id: "grid-1",
    type: "Grid",
    props: {},
    styles,
    children: [],
  };
}

describe("resolveEffectiveStyleField", () => {
  const registry = createComponentRegistry();
  registerBuiltInComponents(registry);

  it("shows component defaults when nothing is authored", () => {
    const display = resolveEffectiveStyleField(gridNode(), "base", "display", registry);
    expect(display).toEqual({ value: "grid", source: "component" });

    const gap = resolveEffectiveStyleField(gridNode(), "base", "gap", registry);
    expect(gap).toEqual({ value: "16px", source: "component" });
  });

  it("prefers cascade over component defaults", () => {
    const node = gridNode({ base: { gap: "32px" } });
    const gap = resolveEffectiveStyleField(node, "md", "gap", registry);
    expect(gap).toEqual({ value: "32px", source: "cascade" });
  });

  it("marks values authored at the current breakpoint", () => {
    const node = gridNode({ md: { display: "flex" } });
    const display = resolveEffectiveStyleField(node, "md", "display", registry);
    expect(display).toEqual({ value: "flex", source: "authored" });
  });
});
