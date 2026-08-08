/**
 * Client-side image resize before upload — no external dependency.
 * Strips EXIF by re-encoding through canvas; applies orientation from EXIF
 * via browser decode (createImageBitmap / Image decode handles orientation).
 */

export interface ResizeImageOptions {
  readonly maxEdge?: number;
  readonly quality?: number;
  readonly mimeType?: "image/webp" | "image/jpeg";
}

export interface ResizeImageResult {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly contentType: string;
}

const DEFAULT_MAX_EDGE = 2560;
const DEFAULT_QUALITY = 0.85;

function supportsWebP(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const canvas = document.createElement("canvas");
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

async function loadImageBitmap(file: Blob): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { bitmap, width: bitmap.width, height: bitmap.height };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not decode image."));
      img.src = url;
    });
    return { bitmap: image as unknown as ImageBitmap, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImageForUpload(
  file: File,
  options: ResizeImageOptions = {},
): Promise<ResizeImageResult> {
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const preferredMime =
    options.mimeType ?? (supportsWebP() ? "image/webp" : "image/jpeg");

  const { bitmap, width, height } = await loadImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context unavailable.");
  }

  if ("close" in bitmap && typeof bitmap.close === "function") {
    context.drawImage(bitmap as ImageBitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();
  } else {
    context.drawImage(bitmap as unknown as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Image re-encode failed."));
          return;
        }
        resolve(result);
      },
      preferredMime,
      quality,
    );
  });

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    contentType: preferredMime,
  };
}
