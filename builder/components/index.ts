export * from "./empty-placeholder";
export * from "./page";
export * from "./section";
export * from "./container";
export * from "./stack";
export * from "./heading";
export * from "./text";
export * from "./image";
export * from "./button";
export * from "./grid";
export * from "./navbar";
export * from "./footer";
export * from "./link";
export * from "./link-block";

import type { ComponentRegistry } from "../registry/types";
import { PageComponent } from "./page";
import { SectionComponent } from "./section";
import { ContainerComponent } from "./container";
import { StackComponent } from "./stack";
import { HeadingComponent } from "./heading";
import { TextComponent } from "./text";
import { ImageComponent } from "./image";
import { ButtonComponent } from "./button";
import { GridComponent } from "./grid";
import { NavbarComponent } from "./navbar";
import { FooterComponent } from "./footer";
import { LinkComponent } from "./link";
import { LinkBlockComponent } from "./link-block";

export function registerBuiltInComponents(registry: ComponentRegistry): void {
  registry.register(PageComponent);
  registry.register(SectionComponent);
  registry.register(ContainerComponent);
  registry.register(StackComponent);
  registry.register(HeadingComponent);
  registry.register(TextComponent);
  registry.register(ImageComponent);
  registry.register(ButtonComponent);
  registry.register(GridComponent);
  registry.register(NavbarComponent);
  registry.register(FooterComponent);
  registry.register(LinkComponent);
  registry.register(LinkBlockComponent);
}
