import { describe, expect, it } from "vitest";
import {
  parseBoxShadow,
  parseBoxShadows,
  parseOpacityPercent,
  parseOutline,
  parseTransformMove,
  serializeBoxShadow,
  serializeOpacityPercent,
  serializeOutline,
  upsertBlur,
  upsertTransformMove,
} from "./effects";

describe("effects parsing", () => {
  it("parses and serializes box shadow", () => {
    const shadow = parseBoxShadow("0px 2px 5px 0px rgba(0, 0, 0, 0.2)");
    expect(shadow).toEqual({
      inset: false,
      x: 0,
      y: 2,
      blur: 5,
      spread: 0,
      unit: "px",
      color: "rgba(0, 0, 0, 0.2)",
    });
    expect(serializeBoxShadow(shadow!)).toBe("0px 2px 5px 0px rgba(0, 0, 0, 0.2)");
  });

  it("keeps a shadow authored without a color", () => {
    // `0 2px 4px` is valid CSS and paints in currentColor. Reading the color
    // from the end of the string used to match the trailing `px` of the last
    // length, which serialized to `… 0px px` and killed the shadow.
    const shadow = parseBoxShadow("0 2px 4px");
    expect(shadow?.color).toBeUndefined();
    expect(serializeBoxShadow(shadow!)).toBe("0px 2px 4px 0px");
  });

  it("keeps the authored unit instead of forcing px", () => {
    const shadow = parseBoxShadow("0 0.5rem 1rem rgba(0, 0, 0, 0.2)");
    expect(shadow?.unit).toBe("rem");
    expect(serializeBoxShadow(shadow!)).toBe("0rem 0.5rem 1rem 0rem rgba(0, 0, 0, 0.2)");
  });

  it("passes an expression-valued shadow through untouched", () => {
    const shadow = parseBoxShadow("0 var(--shadow-y) 12px rgba(0, 0, 0, 0.2)");
    expect(shadow?.raw).toBe("0 var(--shadow-y) 12px rgba(0, 0, 0, 0.2)");
    expect(serializeBoxShadow(shadow!)).toBe("0 var(--shadow-y) 12px rgba(0, 0, 0, 0.2)");
  });

  it("keeps a bare color keyword as the color", () => {
    expect(parseBoxShadow("0 2px 4px red")?.color).toBe("red");
    expect(parseBoxShadow("inset 0 0 0 1px currentColor")?.color).toBe("currentColor");
  });

  it("parses comma-separated shadows with rgba colors", () => {
    const shadows = parseBoxShadows(
      "0px 2px 5px 0px rgba(0, 0, 0, 0.2), inset 0px 1px 2px 0px #000000",
    );
    expect(shadows).toHaveLength(2);
    expect(shadows[0]?.inset).toBe(false);
    expect(shadows[1]?.inset).toBe(true);
  });

  it("upserts translate3d in transform", () => {
    expect(upsertTransformMove("", { x: 0, y: 4, z: 0 })).toBe("translate3d(0px, 4px, 0px)");
    expect(upsertTransformMove("rotate(45deg)", { x: 10, y: 0, z: 0 })).toBe(
      "translate3d(10px, 0px, 0px) rotate(45deg)",
    );
  });

  it("reads move values from transform", () => {
    expect(parseTransformMove("translate3d(1px, 2px, 3px)")).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("parses outline styles", () => {
    expect(parseOutline("none").style).toBe("none");
    expect(serializeOutline({ style: "dashed", width: 2, color: "#fff" })).toBe(
      "2px dashed #fff",
    );
  });

  it("converts opacity between percent and css", () => {
    expect(parseOpacityPercent(0.5)).toBe(50);
    expect(serializeOpacityPercent(50)).toBe("0.5");
    expect(serializeOpacityPercent(100)).toBe("");
  });

  it("upserts blur filter", () => {
    expect(upsertBlur("", 5)).toBe("blur(5px)");
    expect(upsertBlur("brightness(1.2)", 5)).toBe("brightness(1.2) blur(5px)");
    expect(upsertBlur("blur(5px)", 0)).toBe("");
  });
});
