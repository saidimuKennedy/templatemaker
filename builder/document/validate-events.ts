/**
 * Validation for bindings, conditions, and node events (Plan 29).
 */

import type { ActionStep, Condition, EventName } from "../actions/types";
import { ACTION_STEP_TYPES, EVENT_NAMES, isCondition } from "../actions/types";
import { containsBinding, isBinding, isValidBindPath } from "../bindings/types";
import type { BuilderNode, BuilderProject, ValidationError, ValidationResult } from "./types";

function pushBindingPathErrors(
  value: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (isBinding(value)) {
    if (!isValidBindPath(value.$bind)) {
      errors.push({
        path,
        message: `Invalid binding path "${value.$bind}".`,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      pushBindingPathErrors(entry, `${path}[${index}]`, errors);
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      pushBindingPathErrors(entry, `${path}.${key}`, errors);
    }
  }
}

function validateConditionBindings(condition: Condition, path: string, errors: ValidationError[]): void {
  if ("all" in condition) {
    condition.all.forEach((entry, index) => {
      validateConditionBindings(entry, `${path}.all[${index}]`, errors);
    });
    return;
  }
  if ("any" in condition) {
    condition.any.forEach((entry, index) => {
      validateConditionBindings(entry, `${path}.any[${index}]`, errors);
    });
    return;
  }
  if ("not" in condition) {
    validateConditionBindings(condition.not, `${path}.not`, errors);
    return;
  }
  pushBindingPathErrors(condition.left, `${path}.left`, errors);
  if (condition.right !== undefined) {
    pushBindingPathErrors(condition.right, `${path}.right`, errors);
  }
}

function validateActionStep(
  step: unknown,
  path: string,
  nodeIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  if (typeof step !== "object" || step === null || !("type" in step)) {
    errors.push({ path, message: "Action step must be an object with a type." });
    return;
  }

  const type = (step as { type: unknown }).type;
  if (typeof type !== "string" || !ACTION_STEP_TYPES.includes(type as (typeof ACTION_STEP_TYPES)[number])) {
    errors.push({ path: `${path}.type`, message: `Unknown action step type "${String(type)}".` });
    return;
  }

  if ("when" in step && step.when !== undefined) {
    if (!isCondition(step.when)) {
      errors.push({ path: `${path}.when`, message: "Invalid condition shape." });
    } else {
      validateConditionBindings(step.when, `${path}.when`, errors);
    }
  }

  switch (type) {
    case "navigate": {
      const to = (step as ActionStep & { type: "navigate" }).to;
      if (typeof to !== "string" && !isBinding(to)) {
        errors.push({ path: `${path}.to`, message: "Navigate step requires a string or binding target." });
      } else {
        pushBindingPathErrors(to, `${path}.to`, errors);
      }
      break;
    }
    case "setVariable": {
      const { name, value } = step as ActionStep & { type: "setVariable" };
      if (typeof name !== "string" || name.trim() === "") {
        errors.push({ path: `${path}.name`, message: "setVariable step requires a non-empty name." });
      }
      pushBindingPathErrors(value, `${path}.value`, errors);
      break;
    }
    case "notify": {
      const { level, message } = step as ActionStep & { type: "notify" };
      if (level !== "success" && level !== "error" && level !== "info") {
        errors.push({ path: `${path}.level`, message: "Notify step level must be success, error, or info." });
      }
      if (typeof message !== "string" && !isBinding(message)) {
        errors.push({ path: `${path}.message`, message: "Notify step requires a string or binding message." });
      } else {
        pushBindingPathErrors(message, `${path}.message`, errors);
      }
      break;
    }
    case "closeModal":
    case "openModal": {
      const nodeId = (step as ActionStep & { type: "openModal" | "closeModal" }).nodeId;
      if (typeof nodeId !== "string" || nodeId.trim() === "") {
        errors.push({ path: `${path}.nodeId`, message: `${type} step requires a node id.` });
      } else if (!nodeIds.has(nodeId)) {
        errors.push({
          path: `${path}.nodeId`,
          message: `${type} step references unknown node id "${nodeId}".`,
        });
      }
      break;
    }
    case "submitForm": {
      const { resource, onSuccess, onError } = step as ActionStep & { type: "submitForm" };
      if (typeof resource !== "string" || resource.trim() === "") {
        errors.push({ path: `${path}.resource`, message: "submitForm step requires a resource name." });
      }
      if (onSuccess) {
        if (!Array.isArray(onSuccess)) {
          errors.push({ path: `${path}.onSuccess`, message: "onSuccess must be an array of action steps." });
        } else {
          onSuccess.forEach((nested, index) => {
            validateActionStep(nested, `${path}.onSuccess[${index}]`, nodeIds, errors);
          });
        }
      }
      if (onError) {
        if (!Array.isArray(onError)) {
          errors.push({ path: `${path}.onError`, message: "onError must be an array of action steps." });
        } else {
          onError.forEach((nested, index) => {
            validateActionStep(nested, `${path}.onError[${index}]`, nodeIds, errors);
          });
        }
      }
      break;
    }
  }
}

function collectNodeIds(node: BuilderNode, ids: Set<string>): void {
  ids.add(node.id);
  node.children.forEach((child) => collectNodeIds(child, ids));
}

function validateNodeEvents(
  node: BuilderNode,
  path: string,
  nodeIds: ReadonlySet<string>,
  errors: ValidationError[],
): void {
  if (node.events) {
    for (const [eventName, steps] of Object.entries(node.events)) {
      const eventPath = `${path}.events.${eventName}`;
      if (!EVENT_NAMES.includes(eventName as EventName)) {
        errors.push({
          path: eventPath,
          message: `Unknown event name "${eventName}".`,
        });
        continue;
      }
      if (!Array.isArray(steps)) {
        errors.push({ path: eventPath, message: "Event steps must be an array." });
        continue;
      }
      steps.forEach((step, index) => {
        validateActionStep(step, `${eventPath}[${index}]`, nodeIds, errors);
      });
    }
  }

  pushBindingPathErrors(node.props, `${path}.props`, errors);
  node.children.forEach((child, index) => {
    validateNodeEvents(child, `${path}.children[${index}]`, nodeIds, errors);
  });
}

/** Validates events, action steps, and binding paths across the document. */
export function validateDocumentEvents(project: BuilderProject): ValidationResult {
  const errors: ValidationError[] = [];
  const nodeIds = new Set<string>();

  project.pages.forEach((page) => {
    collectNodeIds(page.root, nodeIds);
  });

  project.pages.forEach((page, index) => {
    validateNodeEvents(page.root, `pages[${index}].root`, nodeIds, errors);
  });

  return { valid: errors.length === 0, errors };
}

export { containsBinding };
