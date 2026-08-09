import type { NodeId } from "../document/types";
import type { PropertyField } from "../registry/types";

export interface InspectorField {
  readonly key: string;
  readonly label: string;
  /** Plain-language help for this field, rendered under its label. */
  readonly description?: string;
  readonly type: PropertyField["type"];
  readonly value: unknown;
  readonly options?: PropertyField["options"];
}

export interface InspectorModel {
  readonly nodeId: NodeId;
  readonly componentType: string;
  /** Human name for the header; falls back to `componentType`. */
  readonly componentLabel: string;
  /** What this component is for, shown above its fields. */
  readonly componentDescription?: string;
  readonly fields: readonly InspectorField[];
}
