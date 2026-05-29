import { z } from "zod";
import {
  LinksSchema,
  ProfileSchema,
  ProjectSchema,
  SkillGroupSchema,
} from "@/lib/schema";

export const bioStepSchema = z.object({
  profile: ProfileSchema,
});

export const projectsStepSchema = z.object({
  projects: z.array(ProjectSchema),
});

export const skillsStepSchema = z.object({
  skills: z.array(SkillGroupSchema),
});

export const linksStepSchema = z.object({
  links: LinksSchema,
});

export type BioStepValues = z.infer<typeof bioStepSchema>;
export type ProjectsStepValues = z.infer<typeof projectsStepSchema>;
export type SkillsStepValues = z.infer<typeof skillsStepSchema>;
export type LinksStepValues = z.infer<typeof linksStepSchema>;
