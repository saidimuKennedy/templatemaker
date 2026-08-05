import { nanoid } from "nanoid";
import type { NodeId, PageId } from "./types";

export function generateNodeId(): NodeId {
  return nanoid();
}

export function generatePageId(): PageId {
  return nanoid();
}
