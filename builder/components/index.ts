export * from "./page";
export * from "./section";
export * from "./container";
export * from "./stack";
export * from "./heading";
export * from "./text";
export * from "./image";
export * from "./button";

import type { ComponentRegistry } from "../registry/types";
import { PageComponent } from "./page";
import { SectionComponent } from "./section";
import { ContainerComponent } from "./container";
import { StackComponent } from "./stack";
import { HeadingComponent } from "./heading";
import { TextComponent } from "./text";
import { ImageComponent } from "./image";
import { ButtonComponent } from "./button";

export function registerBuiltInComponents(registry: ComponentRegistry): void {
  registry.register(PageComponent);
  registry.register(SectionComponent);
  registry.register(ContainerComponent);
  registry.register(StackComponent);
  registry.register(HeadingComponent);
  registry.register(TextComponent);
  registry.register(ImageComponent);
  registry.register(ButtonComponent);
}
