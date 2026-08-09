import type { ResourceDefinition } from "@/builder/resources/types";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

function definitionJson(definition: ResourceDefinition): Prisma.InputJsonValue {
  return definition as unknown as Prisma.InputJsonValue;
}

/** Syncs document resource definitions to Prisma on publish. */
export async function syncResourcesForPortfolio(
  portfolioId: string,
  resources: readonly ResourceDefinition[] | undefined,
): Promise<void> {
  const definitions = resources ?? [];
  const names = new Set(definitions.map((resource) => resource.name));

  await prisma.$transaction(async (tx) => {
    if (definitions.length === 0) {
      await tx.resource.deleteMany({ where: { portfolioId } });
      return;
    }

    for (const definition of definitions) {
      await tx.resource.upsert({
        where: {
          portfolioId_name: {
            portfolioId,
            name: definition.name,
          },
        },
        create: {
          portfolioId,
          name: definition.name,
          definition: definitionJson(definition),
        },
        update: {
          definition: definitionJson(definition),
        },
      });
    }

    await tx.resource.deleteMany({
      where: {
        portfolioId,
        name: { notIn: [...names] },
      },
    });
  });
}

export async function ensureResourceRow(
  portfolioId: string,
  definition: ResourceDefinition,
) {
  return prisma.resource.upsert({
    where: {
      portfolioId_name: {
        portfolioId,
        name: definition.name,
      },
    },
    create: {
      portfolioId,
      name: definition.name,
      definition: definitionJson(definition),
    },
    update: {
      definition: definitionJson(definition),
    },
  });
}

export async function listRecords(resourceId: string) {
  return prisma.appRecord.findMany({
    where: { resourceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecord(resourceId: string, recordId: string) {
  return prisma.appRecord.findFirst({
    where: { id: recordId, resourceId },
  });
}

export async function createRecord(resourceId: string, data: Record<string, unknown>) {
  return prisma.appRecord.create({
    data: { resourceId, data: data as Prisma.InputJsonValue },
  });
}

export async function updateRecord(
  resourceId: string,
  recordId: string,
  data: Record<string, unknown>,
) {
  return prisma.appRecord.update({
    where: { id: recordId, resourceId },
    data: { data: data as Prisma.InputJsonValue },
  });
}

export async function deleteRecord(resourceId: string, recordId: string) {
  return prisma.appRecord.delete({
    where: { id: recordId, resourceId },
  });
}
