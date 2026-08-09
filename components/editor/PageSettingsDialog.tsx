"use client";

import { useEffect, useState } from "react";
import type { BuilderPage } from "@/builder/document/types";
import {
  isIndexPagePath,
  pathToSlug,
  slugToPath,
  suggestPath,
  validatePageSlug,
} from "@/builder/pages/suggest-path";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageSettingsDialogProps = {
  readonly page: BuilderPage | null;
  readonly pages: readonly BuilderPage[];
  readonly isPublished: boolean;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (payload: { name: string; path: string }) => void;
};

export function PageSettingsDialog({
  page,
  pages,
  isPublished,
  open,
  onOpenChange,
  onSave,
}: PageSettingsDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!page || !open) {
      return;
    }
    setName(page.name);
    setSlug(isIndexPagePath(page.path) ? "" : pathToSlug(page.path));
    setSlugManuallyEdited(false);
    setError(undefined);
  }, [page, open]);

  if (!page) {
    return null;
  }

  const isIndex = isIndexPagePath(page.path);
  const previewPath = isIndex ? "/" : slugToPath(slug);

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    if (!slugManuallyEdited && !isIndex) {
      setSlug(pathToSlug(suggestPath(nextName, pages, page.id)));
    }
  };

  const handleSlugChange = (nextSlug: string) => {
    setSlugManuallyEdited(true);
    setSlug(nextSlug);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }
    if (!isIndex) {
      const slugError = validatePageSlug(slug, pages, page.id);
      if (slugError) {
        setError(slugError);
        return;
      }
    }
    setError(undefined);
    onSave({ name: trimmedName, path: isIndex ? "/" : slugToPath(slug) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Page settings</DialogTitle>
          <DialogDescription>
            {isIndex
              ? "This is the home page. Its URL stays at /."
              : "Edit the page name and URL slug."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="page-name">Name</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </div>
          {!isIndex ? (
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="page-slug"
                  value={slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Preview: {previewPath}</p>
            </div>
          ) : null}
          {isPublished ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
              This portfolio is published. Changing the slug will break existing bookmarks and
              search links. Redirects are not supported yet.
            </p>
          ) : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
