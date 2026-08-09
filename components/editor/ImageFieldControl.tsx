"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createAssetUploadTicket,
  finalizeAssetUpload,
  isAssetUploadConfigured,
  listUserAssets,
  type AssetRecord,
} from "@/app/(dashboard)/editor/[id]/asset-actions";
import { PLACEHOLDER_MANIFEST } from "@/builder/assets/placeholders";
import { resizeImageForUpload } from "@/builder/assets/resize-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ImageFieldControlProps = {
  readonly fieldKey: string;
  readonly label: string;
  readonly description?: string;
  readonly value: string;
  readonly invalid: boolean;
  readonly onChange: (value: string) => void;
};

export function ImageFieldControl({
  fieldKey,
  label,
  description,
  value,
  invalid,
  onChange,
}: ImageFieldControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadConfigured, setUploadConfigured] = useState(false);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void isAssetUploadConfigured().then(setUploadConfigured);
    void listUserAssets().then((result) => {
      if (result.success) {
        setAssets(result.assets);
      }
    });
  }, []);

  const handleUpload = (file: File) => {
    setUploadError(null);
    startTransition(async () => {
      try {
        const resized = await resizeImageForUpload(file);
        const ticketResult = await createAssetUploadTicket({
          contentType: resized.contentType,
          byteSize: resized.blob.size,
        });
        if (!ticketResult.success) {
          setUploadError(ticketResult.error);
          return;
        }

        const formData = new FormData();
        for (const [key, fieldValue] of Object.entries(ticketResult.ticket.fields)) {
          formData.append(key, fieldValue);
        }
        formData.append("file", resized.blob, `upload.${resized.contentType.split("/")[1] ?? "webp"}`);

        const uploadResponse = await fetch(ticketResult.ticket.uploadUrl, {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) {
          setUploadError(`Upload failed (${uploadResponse.status}).`);
          return;
        }

        const payload = await uploadResponse.json();
        const finalizeResult = await finalizeAssetUpload(payload);
        if (!finalizeResult.success) {
          setUploadError(finalizeResult.error);
          return;
        }

        setAssets((current) => [finalizeResult.asset, ...current]);
        onChange(finalizeResult.asset.url);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor={fieldKey}>{label}</Label>
        {description ? (
          <p className="text-xs leading-snug text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {value ? (
        <div className="overflow-hidden rounded-md border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-24 w-full object-contain" />
        </div>
      ) : null}

      <Tabs defaultValue="url">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="placeholders">Placeholders</TabsTrigger>
          <TabsTrigger value="uploads" disabled={!uploadConfigured}>
            Uploads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="space-y-2 pt-2">
          <Input
            id={fieldKey}
            type="url"
            value={value}
            placeholder="https://… or data:…"
            data-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
          />
        </TabsContent>
        <TabsContent value="placeholders" className="pt-2">
          <div className="grid grid-cols-3 gap-2">
            {PLACEHOLDER_MANIFEST.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`overflow-hidden rounded-md border ${value === entry.path ? "border-foreground" : "border-border"}`}
                onClick={() => onChange(entry.path)}
                title={entry.description}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={entry.path} alt={entry.description} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="uploads" className="space-y-2 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleUpload(file);
              }
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!uploadConfigured || pending}
            onClick={() => fileInputRef.current?.click()}
          >
            {pending ? "Uploading…" : "Upload image"}
          </Button>
          {uploadError ? <p className="text-xs text-red-600">{uploadError}</p> : null}
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={`overflow-hidden rounded-md border ${value === asset.url ? "border-foreground" : "border-border"}`}
                onClick={() => onChange(asset.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
