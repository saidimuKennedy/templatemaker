/** A prop value resolved at render time from a scope, not authored literally. */
export interface Binding {
  readonly $bind: string;
  readonly fallback?: unknown;
}

const BIND_PATH_PATTERN = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"]);

export function isBinding(value: unknown): value is Binding {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "$bind" in value &&
    typeof (value as Binding).$bind === "string"
  );
}

/** Whether a dotted binding path is syntactically valid and safe to resolve. */
export function isValidBindPath(path: string): boolean {
  if (!BIND_PATH_PATTERN.test(path)) {
    return false;
  }
  const segments = path.split(".");
  return segments.every((segment) => !FORBIDDEN_PATH_SEGMENTS.has(segment));
}

/** Returns true when any nested value in props is a Binding. */
export function containsBinding(value: unknown): boolean {
  if (isBinding(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsBinding);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsBinding);
  }
  return false;
}
