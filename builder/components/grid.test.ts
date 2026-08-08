import { describe, expect, it } from "vitest";
import { gridTemplateColumns } from "./grid";

/**
 * Collapse must be driven by the grid's own width, never by a viewport media
 * query — the canvas simulates viewports with `maxWidth` on a wrapper div, so
 * a media query there matches the browser window and the editor disagrees
 * with published output.
 */
describe("Grid responsive columns", () => {
  it("emits a single track for one-column grids", () => {
    expect(gridTemplateColumns(1, 16)).toBe("1fr");
  });

  it("uses auto-fit so tracks wrap without a breakpoint", () => {
    const template = gridTemplateColumns(3, 16);
    expect(template).toContain("auto-fit");
    expect(template).toContain("minmax(");
    expect(template).not.toContain("@media");
  });

  it("reserves the real gutter when sizing the ideal track", () => {
    // 3 columns means 2 gutters: at 16px gap that is 32px removed before the
    // remaining width is divided. Getting this wrong overflows the row.
    expect(gridTemplateColumns(3, 16)).toContain("calc((100% - 32px) / 3)");
    expect(gridTemplateColumns(4, 8)).toContain("calc((100% - 24px) / 4)");
  });

  it("floors track width so columns drop instead of shrinking forever", () => {
    expect(gridTemplateColumns(3, 16, 240)).toContain("max(240px,");
  });

  it("never lets a single track overflow a narrow container", () => {
    expect(gridTemplateColumns(3, 16)).toContain("min(100%,");
  });

  it("honours a custom minimum column width", () => {
    expect(gridTemplateColumns(2, 16, 320)).toContain("max(320px,");
  });
});
