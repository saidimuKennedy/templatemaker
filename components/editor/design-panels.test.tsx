import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BuilderNode, NodeStyles } from "@/builder/document/types";
import { createPortfolioRegistry } from "@/lib/builder/registry";
import type { StyleField } from "@/builder/styles/fields";
import { expandBorderRadiusShorthand } from "@/builder/styles/fields";
import { BorderRadiusEditor } from "./BorderRadiusEditor";
import { BordersPanelEditor } from "./BordersPanelEditor";
import { LayoutPanelEditor } from "./LayoutPanelEditor";

const registry = createPortfolioRegistry();

function node(type: string, styles: NodeStyles = {}, props = {}): BuilderNode {
  return { id: "n1", type, props, styles, children: [] };
}

type Written = { key: string; value: string };

function renderLayout(target: BuilderNode, breakpoint: "base" | "md", written: Written[]) {
  return renderToStaticMarkup(
    <LayoutPanelEditor
      node={target}
      breakpoint={breakpoint}
      registry={registry}
      declaration={{ ...((target.styles as Record<string, Record<string, string>>)[breakpoint] ?? {}) }}
      onFieldChange={(field: StyleField, value: string) =>
        written.push({ key: field.key, value })
      }
    />,
  );
}

describe("LayoutPanelEditor", () => {
  it("reflects a component default rather than assuming block", () => {
    // A Grid's component default is display:grid, and the panel used to write
    // "" for Block — deleting the declaration, so the effective value stayed
    // grid and the button never latched. Showing what is in force is the first
    // half of that fix; the second is that options now write their own value.
    const html = renderLayout(node("Grid", {}, { columns: 3 }), "base", []);

    expect(html).toContain('aria-label="Grid" aria-pressed="true"');
    expect(html).toContain('aria-label="Block" aria-pressed="false"');
    expect(html).toContain("Component default");
  });

  it("marks a cascaded display as inherited rather than showing Block", () => {
    const flexOnMobile = node("Container", { base: { display: "flex" }, md: { color: "red" } });
    const html = renderLayout(flexOnMobile, "md", []);

    expect(html).toContain('aria-label="Flex" aria-pressed="true"');
    expect(html).toContain('aria-label="Block" aria-pressed="false"');
    expect(html).toContain("Inherited from smaller breakpoints");
  });

  it("offers a clear control only where this breakpoint authors the value", () => {
    const authored = node("Container", { base: { display: "flex" } });
    expect(renderLayout(authored, "base", [])).toContain("Clear display override");

    const inheritedOnly = node("Container", { base: { display: "flex" } });
    expect(renderLayout(inheritedOnly, "md", [])).not.toContain("Clear display override");
  });
});

describe("BordersPanelEditor", () => {
  it("shows a border cascaded from a smaller breakpoint instead of None", () => {
    const styles: NodeStyles = {
      base: { borderStyle: "solid", borderWidth: "2px", borderColor: "#000000" },
      md: {},
    };
    const html = renderToStaticMarkup(
      <BordersPanelEditor
        node={node("Container", styles)}
        breakpoint="md"
        registry={registry}
        declaration={{}}
        onFieldChange={() => {}}
        onDeclarationPatch={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Solid" aria-pressed="true"');
    expect(html).toContain('aria-label="None" aria-pressed="false"');
    expect(html).toContain("Inherited from smaller breakpoints");
    // the width field shows the inherited value as its placeholder
    expect(html).toContain('placeholder="2px"');
  });
});

describe("BorderRadiusEditor", () => {
  function renderRadius(declaration: Record<string, string | number>) {
    const target: BuilderNode = {
      id: "n1",
      type: "Container",
      props: {},
      styles: { base: declaration },
      children: [],
    };
    return renderToStaticMarkup(
      <BorderRadiusEditor
        node={target}
        breakpoint="base"
        registry={registry}
        declaration={declaration}
        onPatch={() => {}}
      />,
    );
  }

  it("keeps percentage and expression radii as written", () => {
    // Formatting every corner as a number showed a 50% pill radius as "50",
    // which the next edit wrote back as 50px, and showed calc() as 0.
    const html = renderRadius({
      borderTopLeftRadius: "50%",
      borderTopRightRadius: "calc(1rem + 2px)",
    });
    expect(html).toContain('value="50%"');
    expect(html).toContain('value="calc(1rem + 2px)"');
  });

  it("reads corners out of a multi-value shorthand", () => {
    // Previously the shorthand stayed intact, the editor showed four empty
    // corners, and its first write deleted the shorthand outright.
    const html = renderRadius(expandBorderRadiusShorthand({ borderRadius: "8px 16px" }));
    expect(html).toContain('value="8"');
    expect(html).toContain('value="16"');
    expect(html).toContain("border-radius:8px 16px 8px 16px");
  });

  it("offers a reset once a corner is authored", () => {
    expect(renderRadius({ borderTopLeftRadius: "8px" })).toContain("Clear radius override");
    expect(renderRadius({})).not.toContain("Clear radius override");
  });
});
