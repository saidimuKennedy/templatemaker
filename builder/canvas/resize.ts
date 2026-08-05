import type { NodeId, PageId } from "../document/types";
import type { Command } from "../history/types";
import type { NodeStyleRules } from "../styles/types";

export function resolveResizeCommand(
  pageId: PageId,
  nodeId: NodeId,
  dimension: "width" | "height",
  value: number | string,
): Command {
  const styles: NodeStyleRules = {
    base: { [dimension]: value },
  };

  return {
    type: "UpdateStyles",
    payload: {
      pageId,
      nodeId,
      styles,
    },
  };
}
