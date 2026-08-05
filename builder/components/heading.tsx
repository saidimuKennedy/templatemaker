import { createElement } from "react";
import type { ComponentDefinition } from "../registry/types";

const HEADING_LEVELS = ["1", "2", "3", "4", "5", "6"] as const;

function HeadingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <text x="1" y="13" fontSize="12" fontWeight="bold" fill="currentColor">
        H
      </text>
    </svg>
  );
}

function normalizeLevel(level: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = typeof level === "number" ? level : Number(level);
  if (n >= 1 && n <= 6) {
    return n as 1 | 2 | 3 | 4 | 5 | 6;
  }
  return 2;
}

function HeadingRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const level = normalizeLevel(props.level);
  const text = typeof props.text === "string" ? props.text : "Heading";
  const style = props.style as React.CSSProperties | undefined;
  return createElement(
    `h${level}`,
    { "data-node-type": "Heading", "data-node-id": id, style },
    text,
  );
}

export const HeadingComponent: ComponentDefinition = {
  type: "Heading",
  category: "Content",
  icon: HeadingIcon,
  renderer: HeadingRenderer,
  defaultProps: { text: "Heading", level: 2 },
  propertySchema: [
    {
      key: "text",
      label: "Text",
      type: "string",
      defaultValue: "Heading",
    },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: HEADING_LEVELS.map((n) => ({ label: `H${n}`, value: n })),
      defaultValue: "2",
    },
  ],
  constraints: {},
};
