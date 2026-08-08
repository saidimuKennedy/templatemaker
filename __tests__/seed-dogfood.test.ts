import { describe, it, expect } from "vitest";
import { buildDogfoodDocument } from "@/scripts/seed-dogfood-portfolio";
import { createPortfolioRegistry } from "@/lib/builder/registry";
import { validatePortfolioDocument } from "@/lib/builder/content";
import type { BuilderNode } from "@/builder/document/types";

function countNodes(node: BuilderNode): number {
  return 1 + node.children.reduce((acc, child) => acc + countNodes(child), 0);
}

function maxDepth(node: BuilderNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(maxDepth));
}

describe("Seed Dogfood Document", () => {
  it("validates successfully against the portfolio registry", () => {
    const doc = buildDogfoodDocument("test-portfolio-id");
    const registry = createPortfolioRegistry();
    const validation = validatePortfolioDocument(doc, registry);

    expect(countNodes(doc.pages[0].root)).toBeGreaterThanOrEqual(80);
    expect(maxDepth(doc.pages[0].root)).toBeGreaterThanOrEqual(6);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
