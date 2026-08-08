/**
 * Asset storage provider abstraction (ADR-005 pattern).
 *
 * The app depends on this interface, never on a vendor SDK directly.
 */

export interface UploadTicket {
  readonly uploadUrl: string;
  readonly fields: Record<string, string>;
  readonly publicId: string;
  readonly maxBytes: number;
}

export interface StoredAsset {
  readonly provider: string;
  readonly providerId: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly byteSize: number;
  readonly contentType: string;
}

export interface AssetStorageProvider {
  readonly name: string;
  /** Short-lived credentials for a direct browser upload. */
  createUploadTicket(input: {
    userId: string;
    contentType: string;
    byteSize: number;
  }): Promise<UploadTicket>;
  /**
   * Confirm and normalise what the provider actually stored.
   *
   * `payload` is the provider's upload response relayed by the browser —
   * untrusted input. Implementations MUST prove it came from the provider
   * (signature verification, or a server-side lookup) and MUST confirm the
   * asset belongs to `userId` before returning. Returning a StoredAsset is
   * an assertion that both checks passed.
   */
  finalizeUpload(input: { userId: string; payload: unknown }): Promise<StoredAsset>;
  /** Delivery URL at a requested width/format. */
  getUrl(asset: StoredAsset, opts?: { width?: number; format?: "auto" }): string;
  delete(asset: StoredAsset): Promise<void>;
}

export const IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function isAllowedImageContentType(contentType: string): boolean {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType);
}
