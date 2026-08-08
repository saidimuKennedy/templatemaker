"use client";

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

export type NodeActionState = {
  readonly isPageRoot: boolean;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
};

export type NodeActionHandlers = {
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
  readonly onRename: () => void;
};

export type NodeActions = {
  readonly getActionState: (nodeId: string) => NodeActionState;
  readonly moveNode: (nodeId: string, direction: "up" | "down") => void;
  readonly duplicateNode: (nodeId: string) => void;
  readonly deleteNode: (nodeId: string) => void;
  readonly onRename: (nodeId: string) => void;
};

type NodeActionsMenuContentProps = {
  readonly state: NodeActionState;
  readonly handlers: NodeActionHandlers;
};

export function NodeActionsMenuContent({ state, handlers }: NodeActionsMenuContentProps) {
  const { isPageRoot, canMoveUp, canMoveDown } = state;
  const { onMoveUp, onMoveDown, onDuplicate, onDelete, onRename } = handlers;

  return (
    // Rename hands focus to the Navigator's inline input. Radix restores
    // focus to the trigger when the menu closes, which would steal it
    // straight back — so suppress that restore. This is the right hook
    // for it: preventDefault on an item's onSelect would instead keep
    // the menu open, leaving it parked over the input with the focus
    // trap still active.
    <ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
      <ContextMenuItem disabled={!canMoveUp} onSelect={onMoveUp}>
        Move up
      </ContextMenuItem>
      <ContextMenuItem disabled={!canMoveDown} onSelect={onMoveDown}>
        Move down
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem disabled={isPageRoot} onSelect={onDuplicate}>
        Duplicate
        <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem disabled={isPageRoot} onSelect={onDelete}>
        Delete
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onRename}>Rename</ContextMenuItem>
    </ContextMenuContent>
  );
}
