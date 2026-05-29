import type { ComponentType } from "react";
import {
  ExecutiveTemplate,
  type TemplateProps,
} from "@/components/templates/ExecutiveTemplate";
import { MinimalTemplate } from "@/components/templates/MinimalTemplate";

export type { TemplateProps };

export const TEMPLATE_REGISTRY: Record<string, ComponentType<TemplateProps>> = {
  executive: ExecutiveTemplate,
  minimal: MinimalTemplate,
};

export const TEMPLATE_OPTIONS = [
  {
    id: "executive",
    name: "Executive",
    description: "Bold two-column layout with featured projects",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean centered typography with generous whitespace",
  },
] as const;
