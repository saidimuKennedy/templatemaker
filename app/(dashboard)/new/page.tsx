import { createPortfolioFromForm } from "@/app/(dashboard)/_actions";
import { TEMPLATE_OPTIONS } from "@/components/templates";
import { Button } from "@/components/ui/button";

export default function NewPortfolioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a starting layout. You can customize everything in the editor.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {TEMPLATE_OPTIONS.map((template) => (
          <form key={template.id} action={createPortfolioFromForm}>
            <input type="hidden" name="templateId" value={template.id} />
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
              <div
                className={`h-36 ${
                  template.id === "executive"
                    ? "bg-gradient-to-br from-slate-900 to-slate-700"
                    : "bg-gradient-to-b from-zinc-100 to-white"
                }`}
              >
                <div className="flex h-full flex-col justify-end p-4">
                  {template.id === "executive" ? (
                    <>
                      <div className="h-2 w-24 rounded bg-white/80" />
                      <div className="mt-2 h-2 w-16 rounded bg-white/50" />
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="h-12 rounded bg-white/10" />
                        <div className="h-12 rounded bg-white/10" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto h-2 w-20 rounded bg-zinc-400" />
                      <div className="mx-auto mt-2 h-2 w-28 rounded bg-zinc-300" />
                      <div className="mx-auto mt-4 h-8 w-full max-w-[80%] rounded bg-zinc-200" />
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-medium">{template.name}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  {template.description}
                </p>
                <Button type="submit" className="mt-4 w-full">
                  Use {template.name}
                </Button>
              </div>
            </article>
          </form>
        ))}
      </div>
    </div>
  );
}
