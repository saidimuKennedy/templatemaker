import type { ReactElement } from "react";
import type { ValidationError } from "../document/types";

export type PublishStatus = "draft" | "published" | "archived";

export interface PublishRecord {
  readonly projectId: string;
  readonly status: PublishStatus;
  readonly publishedAt: string | null;
  /** Schema/document version this record was published from — from BuilderDocumentMeta.schemaVersion. */
  readonly schemaVersion: number;
}

export interface PublishResult {
  readonly ok: true;
  readonly record: PublishRecord;
  readonly output: ReactElement;
}

export interface PublishError {
  readonly ok: false;
  readonly errors: readonly ValidationError[];
}

export type PublishOutcome = PublishResult | PublishError;
