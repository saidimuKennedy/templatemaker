import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../../registry/types";

function ProjectCardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
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

function ProjectCardRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const title = stringProp(props, "title");
  const description = stringProp(props, "description");
  const url = stringProp(props, "url");
  const tags = splitCommaList(stringProp(props, "tags"));
  const featured = props.featured === true;
  const style = props.style as CSSProperties | undefined;

  return (
    <article
      data-node-type="ProjectCard"
      data-node-id={id}
      data-featured={featured ? "true" : undefined}
      style={style}
    >
      <h3>{title}</h3>
      <p>{description}</p>
      {tags.length > 0 ? (
        <p>
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </p>
      ) : null}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          View project
        </a>
      ) : null}
    </article>
  );
}

export const ProjectCardComponent: ComponentDefinition = {
  type: "ProjectCard",
  category: "Business",
  icon: ProjectCardIcon,
  renderer: ProjectCardRenderer,
  defaultProps: {
    title: "",
    description: "",
    url: "",
    tags: "",
    featured: false,
  },
  propertySchema: [
    { key: "title", label: "Title", type: "string", defaultValue: "" },
    { key: "description", label: "Description", type: "string", defaultValue: "" },
    { key: "url", label: "URL", type: "string", defaultValue: "" },
    { key: "tags", label: "Tags", type: "string", defaultValue: "" },
    { key: "featured", label: "Featured", type: "boolean", defaultValue: false },
  ],
  constraints: { allowedChildren: [] },
};
