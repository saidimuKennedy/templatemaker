import { createElement } from "react";
import type { CSSProperties } from "react";
import { HelpCircle } from "lucide-react";
import type { ComponentDefinition } from "../registry/types";
import type { NodeProps } from "../document/types";
import { ICON_NAMES, resolveIcon } from "./icon-set";

function IconToolboxGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function resolveIconStyleDefaults(_props: NodeProps = {}): CSSProperties {
  return {
    display: "inline-flex",
    lineHeight: 1,
  };
}

function IconRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const name = typeof props.name === "string" ? props.name : "";
  const label = typeof props.label === "string" ? props.label.trim() : "";
  const style = props.style as React.CSSProperties | undefined;
  const icon = resolveIcon(name) ?? HelpCircle;
  const defaults = resolveIconStyleDefaults();

  // Icons here are decorative by default: they sit beside a heading or a
  // label that already carries the meaning, so exposing them to a screen
  // reader adds an unlabeled graphic and nothing else. An author who wants
  // an icon to *be* the content sets `label`, which makes it an img role
  // with an accessible name.
  const decorative = label === "";

  return (
    <span
      data-node-type="Icon"
      data-node-id={id}
      style={{
        ...defaults,
        ...style,
      }}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      {createElement(icon, { size: "1em", strokeWidth: 2 })}
    </span>
  );
}

export const IconComponent: ComponentDefinition = {
  type: "Icon",
  category: "Content",
  icon: IconToolboxGlyph,
  renderer: IconRenderer,
  defaultProps: { name: "star", label: "" },
  resolveStyleDefaults: resolveIconStyleDefaults,
  propertySchema: [
    {
      key: "name",
      label: "Icon",
      type: "select",
      options: ICON_NAMES.map((name) => ({ label: name, value: name })),
      defaultValue: "star",
    },
    {
      key: "label",
      label: "Accessible label",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: { allowedChildren: [] },
};
