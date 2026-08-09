import type { Condition } from "../actions/types";
import type { NodeProps } from "../document/types";
import { isBinding, type Binding } from "./types";

export interface BindingScope {
  readonly data?: Readonly<Record<string, unknown>>;
  readonly route?: { readonly params?: Readonly<Record<string, string>> };
  readonly form?: Readonly<Record<string, unknown>>;
  readonly user?: Readonly<Record<string, unknown>>;
  readonly vars?: Readonly<Record<string, unknown>>;
}

function resolveScopeRoot(scopeName: string, scope: BindingScope): unknown {
  switch (scopeName) {
    case "data":
      return scope.data;
    case "route":
      return scope.route;
    case "form":
      return scope.form;
    case "user":
      return scope.user;
    case "vars":
      return scope.vars;
    default:
      return undefined;
  }
}

function resolvePath(root: unknown, segments: readonly string[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    if (!Object.hasOwn(current, segment)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function resolveBinding(binding: Binding, scope: BindingScope): unknown {
  const segments = binding.$bind.split(".");
  if (segments.length === 0) {
    return binding.fallback;
  }

  const [scopeName, ...pathSegments] = segments;
  const root = resolveScopeRoot(scopeName, scope);
  if (root === undefined) {
    return binding.fallback;
  }

  const resolved =
    pathSegments.length === 0 ? root : resolvePath(root, pathSegments);

  if (resolved === undefined) {
    return binding.fallback;
  }
  return resolved;
}

export function resolveValue(value: unknown, scope: BindingScope): unknown {
  if (isBinding(value)) {
    return resolveBinding(value, scope);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveValue(entry, scope));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = resolveValue(entry, scope);
    }
    return result;
  }
  return value;
}

export function resolveProps(props: NodeProps, scope: BindingScope): NodeProps {
  const result: NodeProps = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = resolveValue(value, scope);
  }
  return result;
}

function compareValues(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return typeof left === "number" && typeof right === "number" && left > right;
    case "lt":
      return typeof left === "number" && typeof right === "number" && left < right;
    case "gte":
      return typeof left === "number" && typeof right === "number" && left >= right;
    case "lte":
      return typeof left === "number" && typeof right === "number" && left <= right;
    case "contains":
      if (typeof left === "string" && typeof right === "string") {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return false;
    case "empty":
      return (
        left === undefined ||
        left === null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    case "notEmpty":
      return !compareValues(left, "empty", right);
    default:
      return false;
  }
}

export function evaluateCondition(condition: Condition, scope: BindingScope): boolean {
  if ("all" in condition) {
    return condition.all.every((entry) => evaluateCondition(entry, scope));
  }
  if ("any" in condition) {
    return condition.any.some((entry) => evaluateCondition(entry, scope));
  }
  if ("not" in condition) {
    return !evaluateCondition(condition.not, scope);
  }

  const left = resolveValue(condition.left, scope);
  const right =
    condition.right === undefined ? undefined : resolveValue(condition.right, scope);
  return compareValues(left, condition.op, right);
}
