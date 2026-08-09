import { describe, expect, it } from "vitest";
import { expandBorderRadiusShorthand } from "./fields";

describe("expandBorderRadiusShorthand", () => {
  it("expands single-value borderRadius into four corners", () => {
    const result = expandBorderRadiusShorthand({ borderRadius: "16px", color: "red" });
    expect(result).toEqual({
      color: "red",
      borderTopLeftRadius: "16px",
      borderTopRightRadius: "16px",
      borderBottomRightRadius: "16px",
      borderBottomLeftRadius: "16px",
    });
    expect(result.borderRadius).toBeUndefined();
  });

  it("does not overwrite corners that are already set", () => {
    const result = expandBorderRadiusShorthand({
      borderRadius: "16px",
      borderTopLeftRadius: "8px",
    });
    expect(result.borderTopLeftRadius).toBe("8px");
    expect(result.borderTopRightRadius).toBe("16px");
  });

  it("expands the two-value form to opposite corner pairs", () => {
    // Left as shorthand, the radius editor showed four empty corners and then
    // deleted the shorthand on its first write.
    const result = expandBorderRadiusShorthand({ borderRadius: "8px 16px" });
    expect(result.borderRadius).toBeUndefined();
    expect(result).toMatchObject({
      borderTopLeftRadius: "8px",
      borderTopRightRadius: "16px",
      borderBottomRightRadius: "8px",
      borderBottomLeftRadius: "16px",
    });
  });

  it("expands the four-value form in CSS corner order", () => {
    const result = expandBorderRadiusShorthand({ borderRadius: "1px 2px 3px 4px" });
    expect(result).toMatchObject({
      borderTopLeftRadius: "1px",
      borderTopRightRadius: "2px",
      borderBottomRightRadius: "3px",
      borderBottomLeftRadius: "4px",
    });
  });

  it("leaves elliptical radii alone, having no per-corner equivalent here", () => {
    const result = expandBorderRadiusShorthand({ borderRadius: "50% / 20%" });
    expect(result.borderRadius).toBe("50% / 20%");
    expect(result.borderTopLeftRadius).toBeUndefined();
  });
});
