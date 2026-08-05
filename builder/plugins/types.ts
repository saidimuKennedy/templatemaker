/**
 * Plugin contract (docs/05-component-and-plugin-specification.md,
 * ADR-003).
 *
 * A Plugin is the unit of independent versioning and distribution for
 * components. It must register through the Component Registry and must
 * never reach into engine internals directly.
 */

import type { ComponentDefinition } from "../registry/types";
import type { ComponentRegistry } from "../registry/types";

export interface PluginContext {
  readonly registry: ComponentRegistry;
}

export interface Plugin {
  /** Unique plugin identifier, e.g. "@builder/business-components". */
  readonly name: string;
  readonly version: string;
  /** Components this plugin provides. May also be supplied lazily via install(). */
  readonly components?: readonly ComponentDefinition[];
  /** Called once when the plugin is loaded; the only place components may be registered. */
  install(context: PluginContext): void;
}
