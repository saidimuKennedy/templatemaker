import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "portfolio";
}

export async function generateSlug(name: string): Promise<string> {
  const base = slugifyName(name);

  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = `${base}-${nanoid(6)}`;
    const existing = await prisma.portfolio.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${nanoid(10)}`;
}
