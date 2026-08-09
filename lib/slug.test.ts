import { describe, expect, it } from "vitest";
import { normalizePortfolioSlug } from "@/lib/slug";

describe("normalizePortfolioSlug", () => {
  it("lowercases slug labels", () => {
    expect(normalizePortfolioSlug("Acme")).toBe("acme");
    expect(normalizePortfolioSlug("ALICE-WORK")).toBe("alice-work");
  });
});
