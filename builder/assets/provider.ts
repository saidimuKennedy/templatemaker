import type { AssetStorageProvider } from "./types";
import { createCloudinaryAssetProvider, isCloudinaryConfigured } from "./cloudinary-provider";
import { createS3AssetProvider, isS3Configured } from "./s3-provider";

export function resolveAssetStorageProvider(): AssetStorageProvider {
  const provider = process.env.ASSET_PROVIDER ?? "cloudinary";

  if (provider === "cloudinary") {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "ASSET_PROVIDER=cloudinary but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET is missing.",
      );
    }
    return createCloudinaryAssetProvider();
  }

  if (provider === "s3") {
    if (!isS3Configured()) {
      throw new Error("ASSET_PROVIDER=s3 but S3_ASSET_BUCKET or S3_ASSET_REGION is missing.");
    }
    return createS3AssetProvider();
  }

  throw new Error(`Unknown ASSET_PROVIDER "${provider}". Expected cloudinary or s3.`);
}

export function tryResolveAssetStorageProvider(): AssetStorageProvider | null {
  try {
    return resolveAssetStorageProvider();
  } catch {
    return null;
  }
}
