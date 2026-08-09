import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode } from "@/builder/document/types";
import { createPortfolioRegistry } from "@/lib/builder/registry";
import { PositionPanelEditor } from "./PositionPanelEditor";

const registry = createPortfolioRegistry();

function node(styles: Record<string, Record<string, string | number>>): BuilderNode {
  return { id: "n1", type: "Container", props: {}, styles, children: [] };
}

function render(
  styles: Record<string, Record<string, string | number>>,
  breakpoint: "base" | "md",
): string {
  return renderToStaticMarkup(
    <PositionPanelEditor
      node={node(styles)}
      breakpoint={breakpoint}
      registry={registry}
      declaration={styles[breakpoint] ?? {}}
      onFieldChange={() => {}}
    />,
  );
}

describe("PositionPanelEditor", () => {
  it("keeps offsets reachable at a wider breakpoint when position cascades from base", () => {
    // Styles cascade mobile-first, so this node is still absolute on Tablet.
    // Reading position from the tablet declaration alone reported "Static" and
    // hid every offset the element was actually using.
    const styles = { base: { position: "absolute", top: "0px" }, md: { color: "red" } };
    const html = render(styles, "md");

    expect(html).toContain("Top");
    expect(html).toContain("Left");
    expect(html).not.toContain("flows in normal document order");
    expect(html).toContain("Absolute removes the element from flow");
  });

  it("hides offsets only when the element is genuinely static", () => {
    const html = render({}, "base");
    expect(html).toContain("flows in normal document order");
    expect(html).not.toContain(">Top<");
  });

  it("offers z-index on a static element, where it still orders flex and grid children", () => {
    const html = render({}, "base");
    expect(html).toContain("Z-index");
  });

  it("shows a calc() offset verbatim instead of reducing it to a number", () => {
    // Radix renders the unit trigger's label on the client only, so the unit
    // itself is asserted in builder/styles/dimension.test.ts; what the server
    // markup can prove is that the raw value survives into the input.
    const html = render({ base: { position: "absolute", top: "calc(100% - 10px)" } }, "base");
    expect(html).toContain('value="calc(100% - 10px)"');
  });
});
