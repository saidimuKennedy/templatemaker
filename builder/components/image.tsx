import type { ComponentDefinition } from "../registry/types";

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="6" r="1.5" fill="currentColor" />
      <path d="M1 12 L5 8 L8 11 L11 7 L15 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ImageRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const src = typeof props.src === "string" ? props.src : "";
  const alt = typeof props.alt === "string" ? props.alt : "";
  return <img data-node-type="Image" data-node-id={id} src={src} alt={alt} />;
}

export const ImageComponent: ComponentDefinition = {
  type: "Image",
  category: "Content",
  icon: ImageIcon,
  renderer: ImageRenderer,
  defaultProps: { src: "", alt: "" },
  propertySchema: [
    {
      key: "src",
      label: "Source",
      type: "image",
      defaultValue: "",
    },
    {
      key: "alt",
      label: "Alt text",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: { allowedChildren: [] },
};
