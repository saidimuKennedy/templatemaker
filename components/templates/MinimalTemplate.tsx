import type { PortfolioData } from "@/lib/schema";
import { Github, Globe, Linkedin, Mail, Twitter } from "lucide-react";
import type { TemplateProps } from "@/components/templates/ExecutiveTemplate";

export function MinimalTemplate({ data }: TemplateProps) {
  const { profile, projects, skills, links } = data;

  return (
    <div
      className="min-h-screen bg-[var(--template-bg)] px-6 py-16 text-[var(--template-fg)] md:px-12"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-light tracking-tight md:text-5xl">
          {profile.name || "Your Name"}
        </h1>
        <p className="mt-3 text-lg text-[var(--template-muted)]">
          {profile.tagline || "Tagline"}
        </p>
        {profile.location ? (
          <p className="mt-1 text-sm text-[var(--template-muted)]">{profile.location}</p>
        ) : null}
        {profile.bio ? (
          <p className="mx-auto mt-8 max-w-lg leading-relaxed text-[var(--template-muted)]">
            {profile.bio}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          {links.github ? (
            <a href={links.github} target="_blank" rel="noreferrer" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
          ) : null}
          {links.linkedin ? (
            <a href={links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
          ) : null}
          {links.twitter ? (
            <a href={links.twitter} target="_blank" rel="noreferrer" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </a>
          ) : null}
          {links.website ? (
            <a href={links.website} target="_blank" rel="noreferrer" aria-label="Website">
              <Globe className="h-4 w-4" />
            </a>
          ) : null}
          {links.email ? (
            <a href={`mailto:${links.email}`} aria-label="Email">
              <Mail className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>

      {projects.length > 0 ? (
        <section className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[var(--template-muted)]">
            Work
          </h2>
          <div className="mt-8 divide-y divide-[var(--template-accent)]/15">
            {projects.map((project, i) => (
              <article key={`${project.title}-${i}`} className="py-6 text-center">
                <h3 className="text-lg font-medium">{project.title || "Untitled"}</h3>
                {project.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--template-muted)]">
                    {project.description}
                  </p>
                ) : null}
                {project.url ? (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-[var(--template-accent)] hover:underline"
                  >
                    View →
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {skills.length > 0 ? (
        <section className="mx-auto mt-16 max-w-2xl text-center">
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--template-muted)]">
            Skills
          </h2>
          <div className="mt-6 space-y-4">
            {skills.map((group, i) => (
              <div key={`${group.category}-${i}`}>
                <p className="text-sm font-medium">{group.category}</p>
                <p className="mt-1 text-sm text-[var(--template-muted)]">
                  {group.items.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
