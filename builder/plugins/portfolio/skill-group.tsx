import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../../registry/types";
import { EmptyPlaceholder } from "../../components/empty-placeholder";

function SkillGroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="8" r="1" fill="currentColor" />
      <line x1="6" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <line x1="6" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function stringProp(props: Record<string, unknown>, key: string): string {
  return typeof props[key] === "string" ? props[key] : "";
}

function splitCommaList(value: string): string[] {
  if (value.length === 0) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function SkillGroupRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const category = stringProp(props, "category");
  const items = splitCommaList(stringProp(props, "items"));
  const style = props.style as CSSProperties | undefined;
  const isEmpty = !category && items.length === 0;

  return (
    <div data-node-type="SkillGroup" data-node-id={id} style={style}>
      {isEmpty ? (
        <EmptyPlaceholder label="Empty SkillGroup" />
      ) : (
        <>
          <h4>{category}</h4>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export const SkillGroupComponent: ComponentDefinition = {
  type: "SkillGroup",
  category: "Business",
  icon: SkillGroupIcon,
  renderer: SkillGroupRenderer,
  defaultProps: {
    category: "",
    items: "",
  },
  propertySchema: [
    { key: "category", label: "Category", type: "string", defaultValue: "" },
    { key: "items", label: "Items", type: "string", defaultValue: "" },
  ],
  constraints: { allowedChildren: [] },
};
