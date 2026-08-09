import { describe, expect, it } from "vitest";
import {
  CUSTOM_UNIT,
  isCommittableNumber,
  parseDimension,
  serializeDimension,
  unitSelectValue,
} from "./dimension";

describe("dimension parsing", () => {
  it("keeps the authored unit instead of assuming px", () => {
    // The px-only parser this replaced read "2rem" as the number 2 and rewrote
    // it to "2px" on the first keystroke.
    for (const [raw, unit] of [
      ["2rem", "rem"],
      ["1.5em", "em"],
      ["50vh", "vh"],
      ["100vw", "vw"],
      ["12px", "px"],
      ["50%", "%"],
    ] as const) {
      const parsed = parseDimension(raw);
      expect(parsed.mode, raw).toBe("value");
      expect(parsed.unit, raw).toBe(unit);
      expect(serializeDimension(parsed.numeric, parsed.unit), raw).toBe(raw);
    }
  });

  it("distinguishes rem from em", () => {
    expect(parseDimension("2rem").unit).toBe("rem");
    expect(parseDimension("2em").unit).toBe("em");
  });

  it("handles negative and fractional offsets", () => {
    expect(parseDimension("-12px")).toMatchObject({ mode: "value", numeric: "-12", unit: "px" });
    expect(parseDimension("-.5rem")).toMatchObject({ mode: "value", numeric: "-.5", unit: "rem" });
  });

  it("falls back to the field's default unit for a bare number", () => {
    expect(parseDimension("40", { defaultUnit: "%" })).toMatchObject({
      mode: "value",
      numeric: "40",
      unit: "%",
    });
  });

  it("treats values it cannot split as custom text rather than reinterpreting them", () => {
    for (const raw of ["calc(100% - 10px)", "var(--gutter)", "clamp(1rem, 2vw, 3rem)", "2ch"]) {
      const parsed = parseDimension(raw);
      expect(parsed.mode, raw).toBe("custom");
      expect(parsed.raw, raw).toBe(raw);
      expect(unitSelectValue(parsed), raw).toBe(CUSTOM_UNIT);
    }
  });

  it("recognises keywords only where the field allows them", () => {
    expect(parseDimension("auto", { allowAuto: true })).toMatchObject({
      mode: "keyword",
      keyword: "auto",
    });
    expect(parseDimension("none", { allowNone: true })).toMatchObject({
      mode: "keyword",
      keyword: "none",
    });
    // Offsets accept auto; max-width accepts none. A field that allows neither
    // must not silently drop the word.
    expect(parseDimension("none").mode).toBe("custom");
  });

  it("reports an empty value as empty, not as zero", () => {
    expect(parseDimension(undefined).mode).toBe("empty");
    expect(parseDimension("").mode).toBe("empty");
    expect(serializeDimension("", "px")).toBe("");
  });

  it("refuses to commit partial numbers that would serialize to invalid CSS", () => {
    // Typing "-5" passes through "-", which as `-px` is a declaration the
    // browser drops but the document keeps.
    expect(isCommittableNumber("-")).toBe(false);
    expect(isCommittableNumber(".")).toBe(false);
    expect(isCommittableNumber("")).toBe(false);
    expect(isCommittableNumber("abc")).toBe(false);
    expect(isCommittableNumber("-5")).toBe(true);
    expect(isCommittableNumber(".5")).toBe(true);
    expect(isCommittableNumber("12.5")).toBe(true);
  });
});
