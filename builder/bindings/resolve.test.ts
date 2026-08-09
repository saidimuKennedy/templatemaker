import { describe, expect, it } from "vitest";
import { resolveBinding, resolveProps, evaluateCondition } from "./resolve";

describe("resolveBinding", () => {
  it("returns fallback for unresolvable paths", () => {
    expect(resolveBinding({ $bind: "vars.missing", fallback: "Hello" }, {})).toBe("Hello");
  });

  it("returns undefined when fallback is absent", () => {
    expect(resolveBinding({ $bind: "vars.missing" }, {})).toBeUndefined();
  });

  it("resolves nested paths with Object.hasOwn semantics", () => {
    const scope = { vars: { greeting: "Hi there" } };
    expect(resolveBinding({ $bind: "vars.greeting" }, scope)).toBe("Hi there");
  });

  it("never resolves prototype pollution paths", () => {
    const scope = { vars: Object.create({ inherited: "bad" }) as Record<string, unknown> };
    scope.vars.own = "ok";
    expect(resolveBinding({ $bind: "vars.inherited", fallback: "safe" }, scope)).toBe("safe");
    expect(resolveBinding({ $bind: "vars.own" }, scope)).toBe("ok");
  });

  it("deeply resolves bindings without mutating input props", () => {
    const props = {
      text: { $bind: "vars.greeting", fallback: "Hello" },
      nested: { label: { $bind: "vars.title", fallback: "Title" } },
      list: [{ $bind: "vars.item", fallback: "Item" }],
    };
    const copy = structuredClone(props);
    const resolved = resolveProps(props, { vars: { greeting: "Yo", title: "Headline", item: "One" } });
    expect(props).toEqual(copy);
    expect(resolved.text).toBe("Yo");
    expect(resolved.nested).toEqual({ label: "Headline" });
    expect(resolved.list).toEqual(["One"]);
  });
});

describe("evaluateCondition", () => {
  const scope = { vars: { count: 3, label: "hello world", empty: "" } };

  it("evaluates comparison operators", () => {
    expect(
      evaluateCondition({ left: { $bind: "vars.count" }, op: "gt", right: 2 }, scope),
    ).toBe(true);
    expect(
      evaluateCondition({ left: { $bind: "vars.count" }, op: "eq", right: 3 }, scope),
    ).toBe(true);
    expect(
      evaluateCondition(
        { left: { $bind: "vars.label" }, op: "contains", right: "world" },
        scope,
      ),
    ).toBe(true);
    expect(evaluateCondition({ left: { $bind: "vars.empty" }, op: "empty" }, scope)).toBe(true);
    expect(evaluateCondition({ left: { $bind: "vars.label" }, op: "notEmpty" }, scope)).toBe(
      true,
    );
  });

  it("evaluates all/any/not nesting with bound operands", () => {
    expect(
      evaluateCondition(
        {
          all: [
            { left: { $bind: "vars.count" }, op: "gte", right: 3 },
            { not: { left: { $bind: "vars.empty" }, op: "notEmpty" } },
          ],
        },
        scope,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          any: [
            { left: { $bind: "vars.count" }, op: "lt", right: 1 },
            { left: { $bind: "vars.count" }, op: "eq", right: 3 },
          ],
        },
        scope,
      ),
    ).toBe(true);
  });
});
