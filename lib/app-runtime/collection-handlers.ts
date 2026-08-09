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
import { createRecord, ensureResourceRow, listRecords } from "@/lib/app-runtime/records";

type CollectionRouteContext = {
  params: Promise<{ resource: string }>;
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

/** GET /api/records/[resource] — list records (site origin, no session auth). */
export async function GET(_request: Request, context: CollectionRouteContext) {
  const { resource } = await context.params;
  const resolved = await resolveResourceContext(resource);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { project, definition } = resolved;
  if (!resourceAllows(definition, "read")) {
    return jsonError("Read access denied.", 403);
  }

  const resourceRow = await ensureResourceRow(project.portfolio.id, definition);
  const records = await listRecords(resourceRow.id);

  return NextResponse.json({ data: records.map(serializeRecord) });
}

/** POST /api/records/[resource] — create record (site origin, no session auth). */
export async function POST(request: Request, context: CollectionRouteContext) {
  const { resource } = await context.params;
  const resolved = await resolveResourceContext(resource);
  if ("error" in resolved) {
    return resolved.error;
  }

  const { project, definition } = resolved;
  if (!resourceAllows(definition, "create")) {
    return jsonError("Create access denied.", 403);
  }

  const rateLimit = checkAppRuntimeWriteRateLimit(project.portfolio.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      },
    );
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

  const resourceRow = await ensureResourceRow(project.portfolio.id, definition);
  const record = await createRecord(resourceRow.id, parsed.data as Record<string, unknown>);
  recordAppRuntimeWrite(project.portfolio.id);

  return NextResponse.json({ data: serializeRecord(record) }, { status: 201 });
}
