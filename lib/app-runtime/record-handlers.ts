import { NextResponse } from "next/server";
import { buildRecordZodSchema } from "@/builder/resources/zod-schema";
import {
  getResourceDefinitionFromPortfolio,
  isHoneypotTriggered,
  readSiteSlugFromHeaders,
  resolvePublishedProject,
  resourceAllows,
  stripHoneypotField,
} from "@/lib/app-runtime/context";
import {
  checkAppRuntimeWriteRateLimit,
  recordAppRuntimeWrite,
} from "@/lib/app-runtime/rate-limit";
import {
  deleteRecord,
  ensureResourceRow,
  getRecord,
  updateRecord,
} from "@/lib/app-runtime/records";

type RecordRouteContext = {
  params: Promise<{ resource: string; recordId: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveResourceContext(resourceName: string) {
  const slug = await readSiteSlugFromHeaders();
  if (!slug) {
    return { error: jsonError("App-runtime API requires a site origin.", 404) } as const;
  }

  const project = await resolvePublishedProject(slug);
  if (!project) {
    return { error: jsonError("Published project not found.", 404) } as const;
  }

  const definition = getResourceDefinitionFromPortfolio(project.portfolio, resourceName);
  if (!definition) {
    return { error: jsonError(`Resource "${resourceName}" not found.`, 404) } as const;
  }

  return { project, definition } as const;
}

function serializeRecord(record: {
  id: string;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    ...((record.data as Record<string, unknown>) ?? {}),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function rateLimitResponse(retryAfterMs: number) {
  return NextResponse.json(
    { error: "Rate limit exceeded." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
    },
  );
}

/** GET /api/records/[resource]/[recordId] */
export async function GET(_request: Request, context: RecordRouteContext) {
  const { resource, recordId } = await context.params;
  const resolved = await resolveResourceContext(resource);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { project, definition } = resolved;
  if (!resourceAllows(definition, "read")) {
    return jsonError("Read access denied.", 403);
  }

  const resourceRow = await ensureResourceRow(project.portfolio.id, definition);
  const record = await getRecord(resourceRow.id, recordId);
  if (!record) {
    return jsonError("Record not found.", 404);
  }

  return NextResponse.json({ data: serializeRecord(record) });
}

/** PATCH /api/records/[resource]/[recordId] */
export async function PATCH(request: Request, context: RecordRouteContext) {
  const { resource, recordId } = await context.params;
  const resolved = await resolveResourceContext(resource);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { project, definition } = resolved;
  if (!resourceAllows(definition, "update")) {
    return jsonError("Update access denied.", 403);
  }

  const rateLimit = checkAppRuntimeWriteRateLimit(project.portfolio.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const resourceRow = await ensureResourceRow(project.portfolio.id, definition);
  const existing = await getRecord(resourceRow.id, recordId);
  if (!existing) {
    return jsonError("Record not found.", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonError("Body must be a JSON object.", 400);
  }

  const payload = body as Record<string, unknown>;
  if (isHoneypotTriggered(definition, payload)) {
    return new NextResponse(null, { status: 204 });
  }

  const cleaned = stripHoneypotField(definition, payload);
  const schema = buildRecordZodSchema(definition);
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateRecord(
    resourceRow.id,
    recordId,
    parsed.data as Record<string, unknown>,
  );
  recordAppRuntimeWrite(project.portfolio.id);

  return NextResponse.json({ data: serializeRecord(updated) });
}

/** DELETE /api/records/[resource]/[recordId] */
export async function DELETE(_request: Request, context: RecordRouteContext) {
  const { resource, recordId } = await context.params;
  const resolved = await resolveResourceContext(resource);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { project, definition } = resolved;
  if (!resourceAllows(definition, "delete")) {
    return jsonError("Delete access denied.", 403);
  }

  const rateLimit = checkAppRuntimeWriteRateLimit(project.portfolio.id);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfterMs);
  }

  const resourceRow = await ensureResourceRow(project.portfolio.id, definition);
  const existing = await getRecord(resourceRow.id, recordId);
  if (!existing) {
    return jsonError("Record not found.", 404);
  }

  await deleteRecord(resourceRow.id, recordId);
  recordAppRuntimeWrite(project.portfolio.id);

  return new NextResponse(null, { status: 204 });
}
