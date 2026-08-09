import { Children } from "react";
import type { ComponentDefinition } from "../registry/types";
import { renderEmptyState } from "./empty-placeholder";

const PADDING_MAP: Record<string, string> = {
  sm: "8px",
  md: "16px",
  lg: "32px",
};

function SectionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="4" width="14" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SectionRenderer({
  id,
  props,
  children,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const padding = typeof props.padding === "string" ? props.padding : "md";
  const style = props.style as React.CSSProperties | undefined;
  // An in-page link (`#about`) needs a matching element id, and `data-node-id`
  // is not one — a fragment link has nothing to scroll to without this. The
  // anchor is author-set rather than derived from the node name, because
  // renaming a section must not silently break every link pointing at it.
  const anchor = typeof props.anchor === "string" ? props.anchor.trim() : "";
  return (
    <div
      data-node-type="Section"
      data-node-id={id}
      {...(anchor ? { id: anchor } : {})}
      style={{ padding: PADDING_MAP[padding] ?? PADDING_MAP.md, ...style }}
    >
      {Children.count(children) > 0 ? children : renderEmptyState(props, "Empty Section")}
    </div>
  );
}

export const SectionComponent: ComponentDefinition = {
  type: "Section",
  description:
    "A full-width band of the page, like a hero or a contact strip. Use one Section per topic, and put a Container inside it to keep content off the screen edges.",
  category: "Layout",
  icon: SectionIcon,
  renderer: SectionRenderer,
  defaultProps: { padding: "md", anchor: "" },
  propertySchema: [
    {
      key: "anchor",
      label: "Anchor id",
      description:
        "Lets a link jump straight here, as /page#your-id. Leave empty if nothing links to this section.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "padding",
      label: "Padding",
      description:
        "Breathing room above and below the band. Small tightens it up; Large lets the section read as its own screen.",
      type: "select",
      options: [
        { label: "Small", value: "sm" },
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
      defaultValue: "md",
    },
  ],
  constraints: {},
};
