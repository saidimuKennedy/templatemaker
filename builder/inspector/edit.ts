import type { BuilderNode, PageId } from "../document/types";
import type { Command } from "../history/types";

export function createUpdatePropsCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command {
  return {
    type: "UpdateProps",
    payload: {
      pageId,
      nodeId: node.id,
      props: { [key]: value },
    },
  };
}

export function createUpdateStylesCommand(
  pageId: PageId,
  node: BuilderNode,
  key: string,
  value: unknown,
): Command {
  return {
    type: "UpdateStyles",
    payload: {
      pageId,
      nodeId: node.id,
      styles: { [key]: value },
    },
  };
}
