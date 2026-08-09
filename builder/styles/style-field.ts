/**
 * One way to read a style value for the Design panels.
 *
 * Each panel used to re-derive this, and three of the five dropped the
 * inherited value on the floor: they fell back to a hardcoded default
 * ("none", "static", "block") whenever the current breakpoint had nothing
 * authored, so a border set on Mobile read as "None" on Tablet. Reading always
 * goes through here instead, and the caller gets both what is in force
 * (`value`) and whether this breakpoint owns it (`authored`).
 */

import type { BuilderNode } from "../document/types";
import type { ComponentRegistry } from "../registry/types";
import { effectiveSourceLabel, resolveEffectiveStyleField } from "./effective";
import type { EffectiveStyleSource } from "./effective";
import type { Breakpoint } from "./types";

export interface StyleFieldState {
  /** Set only when this breakpoint's declaration owns the value. */
  readonly authored?: string | number;
  /** In force after cascade and component defaults; undefined if nothing sets it. */
  readonly value?: string | number;
  /** True when the value comes from a smaller breakpoint or a component default. */
  readonly inherited: boolean;
  readonly source?: EffectiveStyleSource;
  /** Effective value as placeholder text, set only when inherited. */
  readonly placeholder?: string;
  /** e.g. "from Mobile" — set only when inherited. */
  readonly sourceLabel?: string;
}

export function readStyleField(
  node: BuilderNode,
  breakpoint: Breakpoint,
  registry: ComponentRegistry,
  declaration: Record<string, string | number>,
  key: string,
): StyleFieldState {
  const authored = declaration[key];
  if (authored !== undefined) {
    return { authored, value: authored, inherited: false, source: "authored" };
  }

  const effective = resolveEffectiveStyleField(node, breakpoint, key, registry);
  if (!effective || effective.source === "authored") {
    return { inherited: false };
  }

  return {
    value: effective.value,
    inherited: true,
    source: effective.source,
    placeholder: String(effective.value),
    sourceLabel: effectiveSourceLabel(effective.source, breakpoint),
  };
}

/**
 * The value a control should show as selected: what is in force, or the CSS
 * initial value when nothing sets it.
 *
 * Panels must not substitute their own default *before* consulting the
 * cascade — that is what made "Block" and "None" look active on elements that
 * were neither.
 */
export function styleFieldValue(state: StyleFieldState, initial: string): string {
  return state.value !== undefined ? String(state.value) : initial;
}
