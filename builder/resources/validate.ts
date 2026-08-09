import type { ValidationError } from "../document/types";
import {
  DEFAULT_RESOURCE_PERMISSIONS,
  isValidResourceName,
  RESOURCE_FIELD_TYPES,
  type ResourceDefinition,
  type ResourceField,
  type ResourcePermissions,
} from "./types";

function validateField(field: ResourceField, path: string, errors: ValidationError[]): void {
  if (!field.name?.trim()) {
    errors.push({ path: `${path}.name`, message: "Field name is required." });
  } else if (!/^[a-z][a-z0-9_]{0,63}$/.test(field.name)) {
    errors.push({
      path: `${path}.name`,
      message: `Field name "${field.name}" must be lowercase alphanumeric (underscore allowed).`,
    });
  }

  if (!RESOURCE_FIELD_TYPES.includes(field.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Unknown field type "${String(field.type)}".`,
    });
  }
}

function validatePermissions(
  permissions: ResourcePermissions | undefined,
  path: string,
  errors: ValidationError[],
): void {
  if (!permissions) {
    return;
  }
  for (const key of ["create", "read", "update", "delete"] as const) {
    const value = permissions[key];
    if (value !== undefined && value !== "public" && value !== "none") {
      errors.push({
        path: `${path}.${key}`,
        message: `Permission "${key}" must be "public" or "none".`,
      });
    }
  }
}

function validateResource(resource: ResourceDefinition, index: number, errors: ValidationError[]): void {
  const path = `resources[${index}]`;

  if (!resource.name?.trim()) {
    errors.push({ path: `${path}.name`, message: "Resource name is required." });
  } else if (!isValidResourceName(resource.name)) {
    errors.push({
      path: `${path}.name`,
      message: `Resource name "${resource.name}" must match ${/^[a-z][a-z0-9_-]{0,63}$/.source}.`,
    });
  }

  if (!Array.isArray(resource.fields) || resource.fields.length === 0) {
    errors.push({ path: `${path}.fields`, message: "A resource must define at least one field." });
  } else {
    resource.fields.forEach((field, fieldIndex) => {
      validateField(field, `${path}.fields[${fieldIndex}]`, errors);
    });

    const fieldNames = new Set<string>();
    for (const field of resource.fields) {
      if (fieldNames.has(field.name)) {
        errors.push({
          path: `${path}.fields`,
          message: `Duplicate field name "${field.name}".`,
        });
      }
      fieldNames.add(field.name);
    }
  }

  if (resource.honeypot !== undefined) {
    const honeypot = resource.honeypot.trim();
    if (honeypot === "") {
      errors.push({ path: `${path}.honeypot`, message: "Honeypot field name cannot be empty." });
    } else if (!resource.fields.some((field) => field.name === honeypot)) {
      errors.push({
        path: `${path}.honeypot`,
        message: `Honeypot field "${honeypot}" is not defined in fields.`,
      });
    }
  }

  validatePermissions(resource.permissions, `${path}.permissions`, errors);
}

/** Validates project-level resource definitions. */
export function validateResources(resources: readonly ResourceDefinition[] | undefined): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!resources || resources.length === 0) {
    return { valid: true, errors };
  }

  const seenNames = new Set<string>();
  resources.forEach((resource, index) => {
    validateResource(resource, index, errors);
    if (resource.name && seenNames.has(resource.name)) {
      errors.push({
        path: `resources[${index}].name`,
        message: `Duplicate resource name "${resource.name}".`,
      });
    }
    if (resource.name) {
      seenNames.add(resource.name);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function findResourceDefinition(
  resources: readonly ResourceDefinition[] | undefined,
  name: string,
): ResourceDefinition | undefined {
  return resources?.find((resource) => resource.name === name);
}

export function defaultPermissionsForResource(
  resource: ResourceDefinition,
): Required<NonNullable<ResourceDefinition["permissions"]>> {
  return {
    create: resource.permissions?.create ?? DEFAULT_RESOURCE_PERMISSIONS.create!,
    read: resource.permissions?.read ?? DEFAULT_RESOURCE_PERMISSIONS.read!,
    update: resource.permissions?.update ?? DEFAULT_RESOURCE_PERMISSIONS.update!,
    delete: resource.permissions?.delete ?? DEFAULT_RESOURCE_PERMISSIONS.delete!,
  };
}
