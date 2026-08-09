import type { CSSProperties } from "react";
import type { ComponentDefinition } from "../../registry/types";
import { EmptyPlaceholder } from "../../components/empty-placeholder";

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
  const isEmpty = !name && !tagline && !bio && !location;

  return (
    <div data-node-type="ProfileHeader" data-node-id={id} style={style}>
      {isEmpty ? (
        <EmptyPlaceholder label="Empty ProfileHeader" />
      ) : (
        <>
          <h1>{name}</h1>
          <p data-role="tagline">{tagline}</p>
          <p>{bio}</p>
          <p>{location}</p>
        </>
      )}
    </div>
  );
}

export const ProfileHeaderComponent: ComponentDefinition = {
  type: "ProfileHeader",
  label: "Profile Header",
  description: "The introduction at the top of your portfolio: who you are, in one screen.",
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
    {
      key: "name",
      label: "Name",
      description: "The name you want to be known by here.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "tagline",
      label: "Tagline",
      description:
        "One line on what you do, read right after your name. Keep it shorter than a sentence.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "bio",
      label: "Bio",
      description:
        "A short paragraph of context. The tagline sells the headline; the bio fills in the detail.",
      type: "string",
      defaultValue: "",
    },
    {
      key: "location",
      label: "Location",
      description:
        "Where you are based, such as Nairobi, Kenya. Leave empty if you would rather not say.",
      type: "string",
      defaultValue: "",
    },
  ],
  constraints: { allowedChildren: [] },
};
