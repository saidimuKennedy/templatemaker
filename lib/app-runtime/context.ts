import { headers } from "next/headers";
import type { Portfolio } from "@prisma/client";
import {
  defaultPermissionsForResource,
  findResourceDefinition,
} from "@/builder/resources/validate";
import type { ResourceDefinition } from "@/builder/resources/types";
import { parseBuilderContent } from "@/lib/builder";
import { prisma } from "@/lib/db";
import { SITE_SLUG_HEADER } from "@/lib/hosts";

export type PublishedProjectContext = {
  readonly portfolio: Portfolio;
  readonly slug: string;
};

export async function readSiteSlugFromHeaders(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get(SITE_SLUG_HEADER);
}

export async function resolvePublishedProject(
  slug: string,
): Promise<PublishedProjectContext | null> {
  const portfolio = await prisma.portfolio.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, status: "PUBLISHED" },
  });

  if (!portfolio) {
    return null;
  }

  return { portfolio, slug: portfolio.slug ?? slug };
}

export function getResourceDefinitionFromPortfolio(
  portfolio: Portfolio,
  resourceName: string,
): ResourceDefinition | undefined {
  const document = parseBuilderContent(portfolio.content);
  if (!document) {
    return undefined;
  }
  return findResourceDefinition(document.resources, resourceName);
}

export function resourceAllows(
  definition: ResourceDefinition,
  action: "create" | "read" | "update" | "delete",
): boolean {
  const permissions = defaultPermissionsForResource(definition);
  return permissions[action] === "public";
}

export function isHoneypotTriggered(
  definition: ResourceDefinition,
  payload: Record<string, unknown>,
): boolean {
  if (!definition.honeypot) {
    return false;
  }
  const value = payload[definition.honeypot];
  if (value === undefined || value === null || value === "") {
    return false;
  }
  return true;
}

/** Strips honeypot and unknown keys before validation. */
export function stripHoneypotField(
  definition: ResourceDefinition,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (!definition.honeypot) {
    return payload;
  }
  const { [definition.honeypot]: _removed, ...rest } = payload;
  return rest;
}
