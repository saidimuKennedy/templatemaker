import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../../registry/types";

function ProfileHeaderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14c0-3 2.2-5 5-5s5 2 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function stringProp(props: Record<string, unknown>, key: string): string {
  return typeof props[key] === "string" ? props[key] : "";
}

function ProfileHeaderRenderer({
  id,
  props,
}: {
  readonly id: string;
  readonly props: Record<string, unknown>;
  readonly children?: React.ReactNode;
}) {
  const name = stringProp(props, "name");
  const tagline = stringProp(props, "tagline");
  const bio = stringProp(props, "bio");
  const location = stringProp(props, "location");
  const style = props.style as CSSProperties | undefined;

  return (
    <div data-node-type="ProfileHeader" data-node-id={id} style={style}>
      <h1>{name}</h1>
      <p data-role="tagline">{tagline}</p>
      <p>{bio}</p>
      <p>{location}</p>
    </div>
  );
}

export const ProfileHeaderComponent: ComponentDefinition = {
  type: "ProfileHeader",
  category: "Business",
  icon: ProfileHeaderIcon,
  renderer: ProfileHeaderRenderer,
  defaultProps: {
    name: "",
    tagline: "",
    bio: "",
    location: "",
  },
  propertySchema: [
    { key: "name", label: "Name", type: "string", defaultValue: "" },
    { key: "tagline", label: "Tagline", type: "string", defaultValue: "" },
    { key: "bio", label: "Bio", type: "string", defaultValue: "" },
    { key: "location", label: "Location", type: "string", defaultValue: "" },
  ],
  constraints: { allowedChildren: [] },
};
