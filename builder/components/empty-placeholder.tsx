import type { CSSProperties } from "react";

/**
 * Shown inside a layout container when it has no children yet. Without
 * this, an empty Stack/Grid/Container/Section renders at zero height and
 * has no clickable area in the canvas, making it impossible to select
 * in order to add content into it.
 */
export function EmptyPlaceholder({ label }: { readonly label: string }) {
  const style: CSSProperties = {
    minHeight: "32px",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #d4d4d8",
    borderRadius: "4px",
    color: "#a1a1aa",
    fontSize: "0.7rem",
    padding: "8px",
  };
  return <div style={style}>{label}</div>;
}
