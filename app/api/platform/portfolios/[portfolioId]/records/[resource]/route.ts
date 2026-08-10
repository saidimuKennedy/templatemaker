import { NextResponse } from "next/server";
import { findResourceDefinition } from "@/builder/resources/validate";
import { ensureResourceRow, listRecords } from "@/lib/app-runtime/records";
import { requireSession } from "@/lib/auth";
import { parseBuilderContent } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { assertPlatformOrigin, PlatformOriginError } from "@/lib/platform-api/origin";

type RouteContext = {
  params: Promise<{ portfolioId: string; resource: string }>;
};

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

/** GET /api/platform/portfolios/[portfolioId]/records/[resource] — read-only submissions list. */
export async function GET(request: Request, context: RouteContext) {
  try {
    assertPlatformOrigin(request);
  } catch (error) {
    if (error instanceof PlatformOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const auth = await requireSession();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { portfolioId, resource } = await context.params;

  const portfolio = await prisma.portfolio.findUnique({ where: { id: portfolioId } });
  if (!portfolio || portfolio.userId !== auth.user.id) {
    return NextResponse.json({ error: "Portfolio not found." }, { status: 404 });
  }

  const document = parseBuilderContent(portfolio.content);
  const definition = findResourceDefinition(document?.resources, resource);
  if (!definition) {
    return NextResponse.json({ error: `Resource "${resource}" not found.` }, { status: 404 });
  }

  const resourceRow = await ensureResourceRow(portfolioId, definition);
  const records = await listRecords(resourceRow.id);

  return NextResponse.json({ data: records.map(serializeRecord) });
}
