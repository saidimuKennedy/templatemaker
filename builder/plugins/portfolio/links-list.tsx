import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../../registry/types";

function LinksListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6.5 9.5l3-3M8.5 6.5h-2a2 2 0 100 4h2M7.5 9.5h2a2 2 0 100-4h-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function stringProp(props: Record<string, unknown>, key: string): string {
  return typeof props[key] === "string" ? props[key] : "";
}

const LINK_FIELDS = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "twitter", label: "Twitter" },
  { key: "website", label: "Website" },
  { key: "email", label: "Email" },
] as const;

function LinksListRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const style = props.style as CSSProperties | undefined;

  const links = LINK_FIELDS.flatMap(({ key, label }) => {
    const value = stringProp(props, key);
    if (!value) {
      return [];
    }
    const href = key === "email" ? `mailto:${value}` : value;
    return [{ key, label, href }];
  });

  return (
    <ul data-node-type="LinksList" data-node-id={id} style={style}>
      {links.map(({ key, label, href }) => (
        <li key={key}>
          <a href={href}>{label}</a>
        </li>
      ))}
    </ul>
  );
}

export const LinksListComponent: ComponentDefinition = {
  type: "LinksList",
  category: "Business",
  icon: LinksListIcon,
  renderer: LinksListRenderer,
  defaultProps: {
    github: "",
    linkedin: "",
    twitter: "",
    website: "",
    email: "",
  },
  propertySchema: [
    { key: "github", label: "GitHub", type: "string", defaultValue: "" },
    { key: "linkedin", label: "LinkedIn", type: "string", defaultValue: "" },
    { key: "twitter", label: "Twitter", type: "string", defaultValue: "" },
    { key: "website", label: "Website", type: "string", defaultValue: "" },
    { key: "email", label: "Email", type: "string", defaultValue: "" },
  ],
  constraints: { allowedChildren: [] },
};
