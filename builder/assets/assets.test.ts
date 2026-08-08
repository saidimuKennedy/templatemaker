import { describe, expect, it } from "vitest";
import { createS3AssetProvider } from "./s3-provider";
import { isCloudinaryConfigured } from "./cloudinary-provider";
import { buildResponsiveImageSources } from "./image-url";

describe("asset storage providers", () => {
  it("S3 stub fails with a clear error", async () => {
    const provider = createS3AssetProvider();
    await expect(
      provider.createUploadTicket({
        userId: "user-1",
        contentType: "image/jpeg",
        byteSize: 1024,
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it("skips Cloudinary integration when credentials are absent", () => {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      expect(isCloudinaryConfigured()).toBe(true);
      return;
    }
    expect(isCloudinaryConfigured()).toBe(false);
  });

  it("returns plain src for placeholder paths without srcset", () => {
    const result = buildResponsiveImageSources("/placeholders/portrait-plant.jpg");
    expect(result.src).toBe("/placeholders/portrait-plant.jpg");
    expect(result.srcSet).toBeUndefined();
    expect(result.loading).toBe("lazy");
  });
});
