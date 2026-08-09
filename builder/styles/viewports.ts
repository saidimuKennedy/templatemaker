import type { Breakpoint } from "./types";

/** Canvas preview max-width per breakpoint — shared by Canvas and the top bar. */
export const VIEWPORT_MAX_WIDTH: Record<Breakpoint, string> = {
  base: "390px",
  sm: "640px",
  md: "768px",
  lg: "100%",
};

export const VIEWPORT_WIDTH_LABELS: Record<Breakpoint, string> = {
  base: "390",
  sm: "640",
  md: "768",
  lg: "Full",
};

export function formatViewportWidth(breakpoint: Breakpoint): string {
  const label = VIEWPORT_WIDTH_LABELS[breakpoint];
  if (label === "Full") {
    return "Full width";
  }
  return `${label} PX`;
}
