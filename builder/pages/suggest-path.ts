import type { BuilderPage } from "../document/types";
import { normalizePagePath } from "./normalize-path";

/**
 * Slugify a page name and de-duplicate against existing page paths.
 * Shared by page creation and the settings dialog.
 */
export function suggestPath(name: string, pages: readonly BuilderPage[], excludePageId?: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    return `/page-${pages.length + 1}`;
  }
  let candidate = `/${slug}`;
  let suffix = 2;
  while (
    pages.some(
      (page) =>
        page.id !== excludePageId && normalizePagePath(page.path) === normalizePagePath(candidate),
    )
  ) {
    candidate = `/${slug}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Strip leading slash for slug input display. */
export function pathToSlug(path: string): string {
  const normalized = normalizePagePath(path);
  return normalized === "/" ? "" : normalized.slice(1);
}

/** Convert slug input to a stored page path. */
export function slugToPath(slug: string): string {
  const trimmed = slug.trim();
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }
  const bare = trimmed.replace(/^\/+/, "");
  return `/${bare}`;
}

export function isIndexPagePath(path: string): boolean {
  return normalizePagePath(path) === "/";
}

export function validatePageSlug(
  slug: string,
  pages: readonly BuilderPage[],
  excludePageId?: string,
): string | undefined {
  const trimmed = slug.trim();
  if (trimmed === "") {
    return "Slug cannot be empty.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(trimmed.replace(/^\/+/, ""))) {
    return "Slug may only contain letters, numbers, and hyphens.";
  }
  const path = slugToPath(trimmed);
  const duplicate = pages.find(
    (page) =>
      page.id !== excludePageId && normalizePagePath(page.path) === normalizePagePath(path),
  );
  if (duplicate) {
    return `Path "${normalizePagePath(path)}" is already used by page "${duplicate.name}".`;
  }
  return undefined;
}
