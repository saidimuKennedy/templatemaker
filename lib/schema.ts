import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const ProjectSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  tags: z.array(z.string()),
  featured: z.boolean(),
});

export const SkillGroupSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const ProfileSchema = z.object({
  name: z.string(),
  tagline: z.string(),
  bio: z.string(),
  location: z.string(),
});

export const LinksSchema = z.object({
  github: z.string(),
  linkedin: z.string(),
  twitter: z.string(),
  website: z.string(),
  email: z.string(),
});

export const PortfolioDataSchema = z.object({
  _version: z.number(),
  profile: ProfileSchema,
  projects: z.array(ProjectSchema),
  skills: z.array(SkillGroupSchema),
  links: LinksSchema,
});

export type PortfolioData = z.infer<typeof PortfolioDataSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

const PortfolioDataLooseSchema = z.object({
  _version: z.number().optional(),
  profile: ProfileSchema.partial().optional(),
  projects: z.array(ProjectSchema.partial()).optional(),
  skills: z.array(SkillGroupSchema.partial()).optional(),
  links: LinksSchema.partial().optional(),
});

export function defaultPortfolioData(): PortfolioData {
  return {
    _version: 1,
    profile: {
      name: "",
      tagline: "",
      bio: "",
      location: "",
    },
    projects: [],
    skills: [],
    links: {
      github: "",
      linkedin: "",
      twitter: "",
      website: "",
      email: "",
    },
  };
}

export function parsePortfolioContent(raw: Prisma.JsonValue): PortfolioData {
  try {
    const loose = PortfolioDataLooseSchema.parse(raw);
    return PortfolioDataSchema.parse({
      ...defaultPortfolioData(),
      ...loose,
      profile: { ...defaultPortfolioData().profile, ...loose.profile },
      links: { ...defaultPortfolioData().links, ...loose.links },
      projects:
        loose.projects?.map((p) => ({
          title: p.title ?? "",
          description: p.description ?? "",
          url: p.url ?? "",
          tags: p.tags ?? [],
          featured: p.featured ?? false,
        })) ?? [],
      skills:
        loose.skills?.map((s) => ({
          category: s.category ?? "",
          items: s.items ?? [],
        })) ?? [],
      _version: loose._version ?? 1,
    });
  } catch {
    return defaultPortfolioData();
  }
}
