/**
 * Resolves the effective value of a style field at a breakpoint: authored
 * declaration, cascade from smaller breakpoints, or component render default
 * (Plan 26, Stage 2).
 */

import type { CSSProperties } from "react";
import type { BuilderNode } from "../document/types";
import type { ComponentRegistry } from "../registry/types";
import { resolveNodeStyle } from "./resolve";
import type { Breakpoint, NodeStyleRules } from "./types";

const BREAKPOINT_ORDER: readonly Breakpoint[] = ["base", "sm", "md", "lg"];

export type EffectiveStyleSource = "authored" | "cascade" | "component";

export interface EffectiveStyleField {
  readonly value: string | number;
  readonly source: EffectiveStyleSource;
}

function breakpointsUpTo(breakpoint: Breakpoint): readonly Breakpoint[] {
  const index = BREAKPOINT_ORDER.indexOf(breakpoint);
  if (index === -1) {
    return ["base"];
  }
  return BREAKPOINT_ORDER.slice(0, index + 1);
}

export function resolveComponentStyleDefaults(
  node: BuilderNode,
  registry: ComponentRegistry,
): CSSProperties {
  const definition = registry.get(node.type);
  return definition?.resolveStyleDefaults?.(node.props) ?? {};
}

function isAuthoredInSmallerBreakpoints(
  rules: NodeStyleRules,
  breakpoint: Breakpoint,
  key: string,
): boolean {
  for (const bp of breakpointsUpTo(breakpoint)) {
    if (rules[bp]?.[key] !== undefined) {
      return true;
    }
  }
  return false;
}

export function resolveEffectiveStyleField(
  node: BuilderNode,
  breakpoint: Breakpoint,
  fieldKey: string,
  registry: ComponentRegistry,
): EffectiveStyleField | undefined {
  const rules = node.styles as NodeStyleRules;
  const authoredAtBreakpoint = rules[breakpoint]?.[fieldKey];

  if (authoredAtBreakpoint !== undefined) {
    return { value: authoredAtBreakpoint, source: "authored" };
  }

  const cascaded = resolveNodeStyle(rules, breakpoint) as Record<string, string | number | undefined>;
  const componentDefaults = resolveComponentStyleDefaults(node, registry) as Record<
    string,
    string | number | undefined
  >;
  const cascadedValue = cascaded[fieldKey];
  const defaultValue = componentDefaults[fieldKey];

  if (cascadedValue !== undefined && isAuthoredInSmallerBreakpoints(rules, breakpoint, fieldKey)) {
    return { value: cascadedValue, source: "cascade" };
  }

  if (defaultValue !== undefined && (typeof defaultValue === "string" || typeof defaultValue === "number")) {
    return { value: defaultValue, source: "component" };
  }

  if (cascadedValue !== undefined) {
    return { value: cascadedValue, source: "cascade" };
  }

  return undefined;
}

export function effectiveSourceLabel(source: EffectiveStyleSource, breakpoint: Breakpoint): string {
  if (source === "component") {
    return "Component default";
  }
  if (source === "cascade") {
    return breakpoint === "base" ? "Inherited" : "Inherited from smaller breakpoints";
  }
  return "";
}
