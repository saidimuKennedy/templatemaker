import { describe, expect, it } from "vitest";
import type { BuilderDocument, BuilderNode, BuilderPage } from "../document/types";
import { buildResponsiveStylesheet } from "./responsive";

function assert(condition: boolean, message: string): void {
  expect(condition, message).toBe(true);
}

function makeDoc(root: BuilderNode): BuilderDocument {
  const page: BuilderPage = { id: "page-1", name: "Home", path: "/", root };
  return {
    id: "proj-1",
    name: "Test",
    meta: { schemaVersion: 1, createdAt: "now", updatedAt: "now" },
    pages: [page],
  };
}

describe("responsive stylesheet generator", () => {
  it("emits real @media rules per breakpoint, keeping base out of the stylesheet", () => {
    const node: BuilderNode = {
      id: "node-1",
      type: "Text",
      props: {},
      styles: {
        base: { fontSize: "16px" },
        md: { fontSize: "24px", fontWeight: "600" },
        lg: { fontSize: "32px" },
      },
      children: [],
    };

    const css = buildResponsiveStylesheet(makeDoc(node));

    assert(!css.includes("16px"), "base styles are not emitted into the media-query stylesheet");
    assert(css.includes("@media (min-width:768px)"), "md breakpoint emits its min-width media query");
    assert(css.includes("@media (min-width:1024px)"), "lg breakpoint emits its min-width media query");
    assert(css.includes('[data-node-id="node-1"]'), "rule targets the node's data-node-id attribute");
    assert(css.includes("font-size:24px"), "camelCase fontSize converts to kebab-case font-size");
    assert(css.includes("font-weight:600"), "fontWeight converts to font-weight");
    assert(css.includes("font-size:24px !important"), "breakpoint declarations carry !important");
    assert(css.includes("font-weight:600 !important"), "every property in a rule gets !important");
  });

  it("does not double-append !important when the value already contains it", () => {
    const node: BuilderNode = {
      id: "node-important",
      type: "Text",
      props: {},
      styles: { lg: { fontSize: "140px !important" } },
      children: [],
    };

    const css = buildResponsiveStylesheet(makeDoc(node));

    assert(css.includes("font-size:140px !important"), "user-supplied !important is preserved once");
    assert(!css.includes("!important !important"), "does not emit duplicated !important");
  });

  it("preserves sm → md → lg emission order per node (source order at wide viewports)", () => {
    const node: BuilderNode = {
      id: "ordered-node",
      type: "Text",
      props: {},
      styles: {
        sm: { fontSize: "20px" },
        md: { fontSize: "24px" },
        lg: { fontSize: "32px" },
      },
      children: [],
    };

    const css = buildResponsiveStylesheet(makeDoc(node));
    const smIndex = css.indexOf("@media (min-width:640px)");
    const mdIndex = css.indexOf("@media (min-width:768px)");
    const lgIndex = css.indexOf("@media (min-width:1024px)");

    assert(smIndex !== -1 && mdIndex !== -1 && lgIndex !== -1, "all three breakpoints are emitted");
    assert(smIndex < mdIndex && mdIndex < lgIndex, "sm/md/lg order is preserved for cascade at wide viewports");
    // String-level only — does not prove the browser cascade resolves inline base vs !important media rules.
  });

  it("sanitizes both the node id (selector) and style values against CSS injection", () => {
    const maliciousNode: BuilderNode = {
      id: 'evil"><script>alert(1)</script>',
      type: "Text",
      props: {},
      styles: { md: { color: "red}</style><script>alert(2)</script>{" } },
      children: [],
    };

    const maliciousCss = buildResponsiveStylesheet(makeDoc(maliciousNode));
    assert(!maliciousCss.includes("<script>"), "sanitizer strips <script> tags from selector and value");
    assert(!maliciousCss.includes("</style>"), "sanitizer strips </style> breakout attempts");
  });

  it("walks into children to collect their rules", () => {
    const parent: BuilderNode = {
      id: "parent-1",
      type: "Stack",
      props: {},
      styles: {},
      children: [{ id: "child-1", type: "Text", props: {}, styles: { sm: { color: "blue" } }, children: [] }],
    };
    const nestedCss = buildResponsiveStylesheet(makeDoc(parent));
    assert(nestedCss.includes('[data-node-id="child-1"]'), "walks into children to collect their rules");
    assert(nestedCss.includes("@media (min-width:640px)"), "sm breakpoint emits its min-width media query");
  });
});
