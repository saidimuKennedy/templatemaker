import type { ComponentDefinition } from "../registry/types";

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TextRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const text = typeof props.text === "string" ? props.text : "Text";
  const style = props.style as React.CSSProperties | undefined;
  return (
    <p data-node-type="Text" data-node-id={id} style={style}>
      {text}
    </p>
  );
}

export const TextComponent: ComponentDefinition = {
  type: "Text",
  description:
    "A paragraph of body copy. For titles use a Heading instead, so the page keeps a readable outline.",
  category: "Content",
  icon: TextIcon,
  renderer: TextRenderer,
  defaultProps: { text: "Text" },
  propertySchema: [
    {
      key: "text",
      label: "Text",
      description: "The words shown on the page.",
      type: "string",
      defaultValue: "Text",
    },
  ],
  constraints: { allowedChildren: [] },
};
