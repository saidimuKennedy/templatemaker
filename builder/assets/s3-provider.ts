/**
 * S3 asset storage stub — interface placeholder until the internal tool is identified.
 *
 * Unknowns at time of writing:
 * - Endpoint style (path-style vs virtual-hosted)
 * - Credential source (IAM role vs static keys vs OIDC)
 * - CDN in front of the bucket (CloudFront? none?)
 * - Whether any image transform service exists (without one, getUrl ignores width)
 */

import type { AssetStorageProvider, StoredAsset } from "./types";

function notConfigured(): never {
  throw new Error(
    "S3 asset storage is not configured. Set ASSET_PROVIDER=cloudinary or implement the S3 adapter when the internal tool is identified.",
  );
}

export function createS3AssetProvider(): AssetStorageProvider {
  return {
    name: "s3",

    async createUploadTicket(): Promise<never> {
      notConfigured();
    },

    async finalizeUpload(): Promise<never> {
      notConfigured();
    },

    getUrl(asset: StoredAsset): string {
      // Plain S3 with no transform service — width requests are ignored.
      return asset.url;
    },

    async delete(): Promise<never> {
      notConfigured();
    },
  };
}

export function isS3Configured(): boolean {
  return Boolean(process.env.S3_ASSET_BUCKET && process.env.S3_ASSET_REGION);
}
