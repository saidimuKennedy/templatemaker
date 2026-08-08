/**
 * The browser uploads straight to Cloudinary and relays the response to
 * `finalizeUpload`. That payload is untrusted: these tests pin the checks
 * that stop an authenticated caller registering an arbitrary URL as a
 * provider-backed asset, which would route around the content-type and
 * byte-size caps enforced when the ticket is minted.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { v2 as cloudinary } from "cloudinary";
import { createCloudinaryAssetProvider } from "./cloudinary-provider";

const CLOUD_NAME = "test-cloud";
const API_SECRET = "test-secret";
const USER_ID = "user-123";

function signedPayload(overrides: Record<string, unknown> = {}) {
  const publicId = `portfolio/${USER_ID}/1700000000-abcd1234`;
  const version = 1700000001;
  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, version: String(version) },
    API_SECRET,
  );

  return {
    public_id: publicId,
    version,
    signature,
    secure_url: `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/v${version}/${publicId}.webp`,
    width: 1600,
    height: 1200,
    bytes: 240_000,
    format: "webp",
    ...overrides,
  };
}

describe("cloudinary finalizeUpload", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = CLOUD_NAME;
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = API_SECRET;
  });

  afterEach(() => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it("accepts a correctly signed response for the calling user", async () => {
    const provider = createCloudinaryAssetProvider();
    const stored = await provider.finalizeUpload({
      userId: USER_ID,
      payload: signedPayload(),
    });

    expect(stored.provider).toBe("cloudinary");
    expect(stored.providerId).toContain(`portfolio/${USER_ID}/`);
    expect(stored.contentType).toBe("image/webp");
    expect(stored.byteSize).toBe(240_000);
  });

  it("rejects a forged signature", async () => {
    const provider = createCloudinaryAssetProvider();
    await expect(
      provider.finalizeUpload({
        userId: USER_ID,
        payload: signedPayload({ signature: "0".repeat(40) }),
      }),
    ).rejects.toThrow(/signature verification/i);
  });

  it("rejects a payload with no signature at all", async () => {
    const provider = createCloudinaryAssetProvider();
    const unsigned: Record<string, unknown> = { ...signedPayload() };
    delete unsigned.signature;
    await expect(
      provider.finalizeUpload({ userId: USER_ID, payload: unsigned }),
    ).rejects.toThrow(/missing signature/i);
  });

  it("rejects an asset belonging to a different user", async () => {
    const provider = createCloudinaryAssetProvider();
    await expect(
      provider.finalizeUpload({ userId: "someone-else", payload: signedPayload() }),
    ).rejects.toThrow(/does not belong to this user/i);
  });

  it("rejects a delivery URL pointing off the configured host", async () => {
    // secure_url travels in the signed payload but the signature does not
    // cover it, so the host has to be checked separately.
    const provider = createCloudinaryAssetProvider();
    await expect(
      provider.finalizeUpload({
        userId: USER_ID,
        payload: signedPayload({ secure_url: "https://evil.example/pwned.jpg" }),
      }),
    ).rejects.toThrow(/delivery host/i);
  });
});
