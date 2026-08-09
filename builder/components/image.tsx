import type { ComponentDefinition } from "../registry/types";
import { buildResponsiveImageSources } from "../assets/image-url";

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1" y="2" width="14" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="6" r="1.5" fill="currentColor" />
      <path d="M1 12 L5 8 L8 11 L11 7 L15 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const OBJECT_FIT_OPTIONS = [
  { label: "Cover", value: "cover" },
  { label: "Contain", value: "contain" },
  { label: "Fill", value: "fill" },
  { label: "None", value: "none" },
] as const;

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
  const objectFit = typeof props.objectFit === "string" ? props.objectFit : "cover";
  const aspectRatio = typeof props.aspectRatio === "string" ? props.aspectRatio : "";
  const style = props.style as React.CSSProperties | undefined;

  const baseStyle: React.CSSProperties = {
    maxWidth: "100%",
    display: "block",
    ...(aspectRatio ? { aspectRatio, width: "100%" } : { height: "auto" }),
    ...(objectFit ? { objectFit: objectFit as React.CSSProperties["objectFit"] } : {}),
    ...style,
  };

  if (!src) {
    return (
      <div
        data-node-type="Image"
        data-node-id={id}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "6rem",
          background: "#f1f1f1",
          color: "#888",
          fontSize: "0.75rem",
          ...baseStyle,
        }}
      >
        No image selected
      </div>
    );
  }

  const responsive = buildResponsiveImageSources(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- builder Image emits srcset for provider assets; plain URLs stay as img
    <img
      data-node-type="Image"
      data-node-id={id}
      src={responsive.src}
      srcSet={responsive.srcSet}
      sizes={responsive.sizes}
      loading={responsive.loading}
      alt={alt}
      style={baseStyle}
    />
  );
}

export const ImageComponent: ComponentDefinition = {
  type: "Image",
  description:
    "A picture. Give it alt text so it still makes sense to screen readers and search engines.",
  category: "Content",
  icon: ImageIcon,
  renderer: ImageRenderer,
  defaultProps: { src: "", alt: "", objectFit: "cover", aspectRatio: "" },
  propertySchema: [
    {
      key: "src",
      label: "Source",
      description: "The picture to show. Upload a file or paste an image URL.",
      type: "image",
      defaultValue: "",
    },
    {
      key: "alt",
      label: "Alt text",
      description:
        "One line describing the picture for screen readers and search engines. Leave empty only when the image is purely decorative.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "objectFit",
      label: "Object fit",
      description:
        "How the picture fills its frame. Cover crops the edges to fill it; Contain fits the whole picture and leaves space around it.",
      type: "select",
      options: OBJECT_FIT_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
      defaultValue: "cover",
    },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      description:
        "Locks the frame's shape, such as 16/9 or 1/1, so the layout does not shift while the picture loads. Leave empty to use the picture's own shape.",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: { allowedChildren: [] },
};

/**
 * Image overlay pattern (Image cannot have children in HTML):
 *
 * Container  base { position: relative, overflow: hidden, borderRadius: 24px }
 * ├─ Image    base { width: 100%, height: 100%, objectFit: cover }
 * └─ Container base { position: absolute, inset 0, backgroundImage: linear-gradient(...) }
 *    └─ Heading / Text / Icon
 */
