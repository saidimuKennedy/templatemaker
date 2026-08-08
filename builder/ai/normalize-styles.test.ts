import { describe, expect, it } from "vitest";
import { resolveNodeStyle } from "../styles/resolve";
import { normalizeNodeStyles } from "./normalize-styles";

describe("normalizeNodeStyles", () => {
  it("confirms flat styles are invisible to resolveNodeStyle until normalized", () => {
    const flat = { backgroundColor: "#ffffff", paddingTop: "16px" };
    expect(resolveNodeStyle(flat as never, "base")).toEqual({});

    const { styles, warnings } = normalizeNodeStyles(flat);
    expect(warnings.some((warning) => warning.type === "flat-wrapped")).toBe(true);
    expect(styles.base).toMatchObject(flat);
    expect(resolveNodeStyle(styles, "base")).toMatchObject(flat);
  });

  it("wraps flat declarations under base", () => {
    const { styles, warnings } = normalizeNodeStyles({
      backgroundColor: "#f1f5f9",
      borderRadius: "24px",
    });

    expect(warnings).toEqual([
      expect.objectContaining({ type: "flat-wrapped" }),
    ]);
    expect(styles).toEqual({
      base: {
        backgroundColor: "#f1f5f9",
        borderRadius: "24px",
      },
    });
  });

  it("preserves breakpoint-keyed declarations", () => {
    const { styles } = normalizeNodeStyles({
      base: { color: "#0f172a", fontSize: "16px" },
      md: { fontSize: "18px" },
    });

    expect(styles.base).toEqual({ color: "#0f172a", fontSize: "16px" });
    expect(styles.md).toEqual({ fontSize: "18px" });
  });

  it("drops unknown style keys with a warning", () => {
    const { styles, warnings } = normalizeNodeStyles({
      base: { backgroundColor: "#fff", notARealCssKey: "nope" },
    });

    expect(styles.base).toEqual({ backgroundColor: "#fff" });
    expect(warnings.some((warning) => warning.message.includes("notARealCssKey"))).toBe(
      true,
    );
  });
});
