export * from "./profile-header";
export * from "./project-card";
export * from "./skill-group";
export * from "./links-list";

import type { ComponentRegistry } from "../../registry/types";
import { ProfileHeaderComponent } from "./profile-header";
import { ProjectCardComponent } from "./project-card";
import { SkillGroupComponent } from "./skill-group";
import { LinksListComponent } from "./links-list";

export function registerPortfolioComponents(registry: ComponentRegistry): void {
  registry.register(ProfileHeaderComponent);
  registry.register(ProjectCardComponent);
  registry.register(SkillGroupComponent);
  registry.register(LinksListComponent);
}
