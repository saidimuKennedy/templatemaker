import { describe, expect, it } from "vitest";
import { isBinding, isValidBindPath, containsBinding } from "./types";

describe("binding types", () => {
  it("detects binding objects", () => {
    expect(isBinding({ $bind: "vars.name" })).toBe(true);
    expect(isBinding({ $bind: "vars.name", fallback: "Hi" })).toBe(true);
    expect(isBinding("literal")).toBe(false);
    expect(isBinding({ bind: "vars.name" })).toBe(false);
  });

  it("validates binding paths and rejects prototype pollution segments", () => {
    expect(isValidBindPath("vars.greeting")).toBe(true);
    expect(isValidBindPath("route.params.id")).toBe(true);
    expect(isValidBindPath("vars.__proto__.polluted")).toBe(false);
    expect(isValidBindPath("vars.constructor")).toBe(false);
    expect(isValidBindPath("vars.a-b")).toBe(false);
    expect(isValidBindPath("")).toBe(false);
  });

  it("finds bindings nested in props", () => {
    expect(containsBinding({ text: { $bind: "vars.greeting" } })).toBe(true);
    expect(containsBinding({ items: [{ $bind: "data.rows" }] })).toBe(true);
    expect(containsBinding({ text: "Hello" })).toBe(false);
  });
});
