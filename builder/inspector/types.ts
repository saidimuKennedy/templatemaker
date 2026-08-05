import type { NodeId } from "../document/types";
import type { PropertyField } from "../registry/types";

export interface InspectorField {
  readonly key: string;
  readonly label: string;
  readonly type: PropertyField["type"];
  readonly value: unknown;
  readonly options?: PropertyField["options"];
}

export interface InspectorModel {
  readonly nodeId: NodeId;
  readonly componentType: string;
  readonly fields: readonly InspectorField[];
}
