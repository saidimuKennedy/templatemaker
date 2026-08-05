/**
 * Public surface of the Builder engine's type contracts.
 *
 * This module re-exports interfaces only — no implementation. Each
 * directory's types.ts is the source of truth for its subsystem; see
 * builder/CONTRIBUTING.md for the non-negotiable rules these contracts
 * encode.
 */

export * from "./document/types";
export * from "./registry/types";
export * from "./renderer/types";
export * from "./history/types";
export * from "./plugins/types";
export * from "./ai/types";
