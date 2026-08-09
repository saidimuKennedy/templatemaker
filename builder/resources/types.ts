/**
 * Resource definitions — project-level schema for application data (Plan 31).
 *
 * Stored on BuilderProject.resources and synced to Prisma on publish.
 * Validation at write time is derived from these definitions server-side.
 */

export const RESOURCE_FIELD_TYPES = [
  "string",
  "text",
  "number",
  "boolean",
  "email",
] as const;

export type ResourceFieldType = (typeof RESOURCE_FIELD_TYPES)[number];

export interface ResourceField {
  readonly name: string;
  readonly type: ResourceFieldType;
  readonly label?: string;
  readonly required?: boolean;
}

export type ResourceAccess = "public" | "none";

export interface ResourcePermissions {
  readonly create?: ResourceAccess;
  readonly read?: ResourceAccess;
  readonly update?: ResourceAccess;
  readonly delete?: ResourceAccess;
}

export interface ResourceDefinition {
  /** URL-safe slug, unique within the project. */
  readonly name: string;
  readonly label?: string;
  readonly fields: readonly ResourceField[];
  /**
   * Hidden field name checked on public writes. Must be absent or empty;
   * bots that fill every input are rejected silently (204/empty success).
   */
  readonly honeypot?: string;
  readonly permissions?: ResourcePermissions;
}

export const DEFAULT_RESOURCE_PERMISSIONS: ResourcePermissions = {
  create: "public",
  read: "none",
  update: "none",
  delete: "none",
};

const RESOURCE_NAME_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

export function isValidResourceName(name: string): boolean {
  return RESOURCE_NAME_PATTERN.test(name);
}

export function normalizeResourcePermissions(
  permissions?: ResourcePermissions,
): Required<ResourcePermissions> {
  return {
    create: permissions?.create ?? DEFAULT_RESOURCE_PERMISSIONS.create!,
    read: permissions?.read ?? DEFAULT_RESOURCE_PERMISSIONS.read!,
    update: permissions?.update ?? DEFAULT_RESOURCE_PERMISSIONS.update!,
    delete: permissions?.delete ?? DEFAULT_RESOURCE_PERMISSIONS.delete!,
  };
}
