/**
 * Token budget measurement for Plan 25 Stage 1d.
 * Estimates output size (~4 chars per token) for styled section vs full page.
 */

import { describe, expect, it } from "vitest";

function estimateTokens(json: string): number {
  return Math.ceil(json.length / 4);
}

const styledSectionOperations = [
  {
    op: "create",
    id: "sec-1",
    pageId: "page-1",
    parentId: "root-1",
    componentType: "Section",
    styles: { base: { paddingTop: "32px", paddingBottom: "32px", backgroundColor: "#ffffff" } },
  },
  {
    op: "create",
    id: "grid-1",
    pageId: "page-1",
    parentId: "sec-1",
    componentType: "Grid",
    props: { columns: 3 },
    styles: { base: { gap: "24px" } },
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    op: "create" as const,
    id: `card-${index}`,
    pageId: "page-1",
    parentId: "grid-1",
    componentType: "Container",
    styles: {
      base: {
        backgroundColor: "#f1f5f9",
        borderRadius: "16px",
        paddingTop: "24px",
        paddingBottom: "24px",
        paddingLeft: "24px",
        paddingRight: "24px",
      },
    },
  })),
];

const fullPageOperations = [
  ...styledSectionOperations,
  ...Array.from({ length: 4 }, (_, sectionIndex) => ({
    op: "create" as const,
    id: `section-${sectionIndex + 2}`,
    pageId: "page-1",
    parentId: "root-1",
    componentType: "Section",
    styles: {
      base: {
        paddingTop: "48px",
        paddingBottom: "48px",
        backgroundColor: sectionIndex % 2 === 0 ? "#ffffff" : "#f8fafc",
      },
    },
  })),
];

describe("AI token budget estimates (Stage 1d)", () => {
  it("reports styled section vs full-page output estimates", () => {
    const sectionJson = JSON.stringify({ operations: styledSectionOperations });
    const fullPageJson = JSON.stringify({ operations: fullPageOperations });

    const sectionTokens = estimateTokens(sectionJson);
    const fullPageTokens = estimateTokens(fullPageJson);

    // Sanity: full page estimate exceeds single section.
    expect(fullPageTokens).toBeGreaterThan(sectionTokens);

    // Report numbers in test output for plan documentation.
    console.info(
      `[token-budget] styled section ~${sectionTokens} tokens; full page ~${fullPageTokens} tokens`,
    );
  });
});
