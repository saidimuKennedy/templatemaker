import type { PortfolioData } from "@/lib/schema";
import { Github, Globe, Linkedin, Mail, Twitter } from "lucide-react";

export type TemplateProps = { data: PortfolioData };

export function ExecutiveTemplate({ data }: TemplateProps) {
  const { profile, projects, skills, links } = data;
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <div
      className="min-h-screen bg-[var(--template-bg)] text-[var(--template-fg)]"
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <header className="border-b border-[var(--template-accent)]/20 bg-[var(--template-surface)] px-8 py-16 md:px-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--template-accent)]">
          Portfolio
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">
          {profile.name || "Your Name"}
        </h1>
        <p className="mt-3 text-xl text-[var(--template-muted)]">
          {profile.tagline || "Professional tagline"}
        </p>
        {profile.location ? (
          <p className="mt-2 text-sm text-[var(--template-muted)]">{profile.location}</p>
        ) : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-12 px-8 py-12 md:grid-cols-[1.4fr_1fr] md:px-16">
        <main className="space-y-10">
          {profile.bio ? (
            <section>
              <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--template-accent)]">
                About
              </h2>
              <p className="mt-3 leading-relaxed text-[var(--template-muted)]">{profile.bio}</p>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--template-accent)]">
              Projects
            </h2>
            <div className="mt-4 space-y-6">
              {[...featured, ...rest].map((project, i) => (
                <article
                  key={`${project.title}-${i}`}
                  className="rounded-lg border border-[var(--template-accent)]/15 bg-[var(--template-surface)] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold">{project.title || "Untitled"}</h3>
                    {project.featured ? (
                      <span className="rounded bg-[var(--template-accent)]/15 px-2 py-0.5 text-xs font-medium text-[var(--template-accent)]">
                        Featured
                      </span>
                    ) : null}
                  </div>
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
                      className="mt-2 inline-block text-sm font-medium text-[var(--template-accent)] hover:underline"
                    >
                      View project →
                    </a>
                  ) : null}
                  {project.tags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--template-accent)]/10 px-2 py-0.5 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-10">
          {skills.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--template-accent)]">
                Skills
              </h2>
              <div className="mt-4 space-y-4">
                {skills.map((group, i) => (
                  <div key={`${group.category}-${i}`}>
                    <h3 className="font-medium">{group.category || "Skills"}</h3>
                    <p className="mt-1 text-sm text-[var(--template-muted)]">
                      {group.items.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-semibold uppercase tracking-wide text-[var(--template-accent)]">
              Connect
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {links.github ? (
                <li>
                  <a href={links.github} className="flex items-center gap-2 hover:text-[var(--template-accent)]" target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </li>
              ) : null}
              {links.linkedin ? (
                <li>
                  <a href={links.linkedin} className="flex items-center gap-2 hover:text-[var(--template-accent)]" target="_blank" rel="noreferrer">
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                </li>
              ) : null}
              {links.twitter ? (
                <li>
                  <a href={links.twitter} className="flex items-center gap-2 hover:text-[var(--template-accent)]" target="_blank" rel="noreferrer">
                    <Twitter className="h-4 w-4" /> Twitter
                  </a>
                </li>
              ) : null}
              {links.website ? (
                <li>
                  <a href={links.website} className="flex items-center gap-2 hover:text-[var(--template-accent)]" target="_blank" rel="noreferrer">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                </li>
              ) : null}
              {links.email ? (
                <li>
                  <a href={`mailto:${links.email}`} className="flex items-center gap-2 hover:text-[var(--template-accent)]">
                    <Mail className="h-4 w-4" /> {links.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
