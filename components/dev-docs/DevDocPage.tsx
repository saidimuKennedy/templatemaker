import Link from "next/link";
import type { ReactNode } from "react";

export function DevDocPage({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Developer documentation
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="dev-doc-body space-y-6 text-sm leading-relaxed text-foreground">{children}</div>
      <footer className="border-t border-border pt-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </Link>
      </footer>
    </article>
  );
}

export function DevDocSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function DevDocTable({
  headers,
  rows,
}: {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border/60 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top text-muted-foreground">
                  {cellIndex === 0 ? (
                    <span className="font-medium text-foreground">{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DevDocCode({ children }: { readonly children: string }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{children}</code>
  );
}
