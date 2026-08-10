/**
 * Cross-checks form/input nodes against project resources (Plan 32 Stage 8).
 */

import type { BuilderNode, BuilderProject, ValidationError, ValidationResult } from "./types";
import { findResourceDefinition } from "../resources/validate";

const FORM_FIELD_TYPES = new Set(["Input", "Textarea", "Select", "Checkbox"]);

function validateFormNode(
  node: BuilderNode,
  path: string,
  project: BuilderProject,
  enclosingFormResource: string | undefined,
  errors: ValidationError[],
): string | undefined {
  let formResource = enclosingFormResource;

  if (node.type === "Form") {
    const resourceName = typeof node.props.resource === "string" ? node.props.resource.trim() : "";
    if (!resourceName) {
      errors.push({ path: `${path}.props.resource`, message: "Form requires a resource name." });
    } else if (!findResourceDefinition(project.resources, resourceName)) {
      errors.push({
        path: `${path}.props.resource`,
        message: `Form references unknown resource "${resourceName}".`,
      });
    } else {
      formResource = resourceName;
    }

    for (const [index, step] of (node.events?.onSubmit ?? []).entries()) {
      if (step.type === "submitForm") {
        if (resourceName && step.resource !== resourceName) {
          errors.push({
            path: `${path}.events.onSubmit[${index}].resource`,
            message: `submitForm targets resource "${step.resource}" but the enclosing Form declares "${resourceName}".`,
          });
        }
      }
    }
  }

  if (FORM_FIELD_TYPES.has(node.type)) {
    const fieldName = typeof node.props.field === "string" ? node.props.field.trim() : "";
    if (!fieldName) {
      errors.push({ path: `${path}.props.field`, message: `${node.type} requires a field name.` });
    } else if (formResource) {
      const definition = findResourceDefinition(project.resources, formResource);
      if (definition && !definition.fields.some((field) => field.name === fieldName)) {
        errors.push({
          path: `${path}.props.field`,
          message: `Field "${fieldName}" is not defined on resource "${formResource}".`,
        });
      }
    }
  }

  node.children.forEach((child, index) => {
    validateFormNode(child, `${path}.children[${index}]`, project, formResource, errors);
  });

  return formResource;
}

/** Validates form nodes, field references, and submitForm resource alignment. */
export function validateDocumentForms(project: BuilderProject): ValidationResult {
  const errors: ValidationError[] = [];

  project.pages.forEach((page, index) => {
    validateFormNode(page.root, `pages[${index}].root`, project, undefined, errors);
  });

  return { valid: errors.length === 0, errors };
}
