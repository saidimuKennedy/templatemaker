/**
 * Cloudinary asset storage adapter — the only file that imports Cloudinary.
 */

import { timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import type { AssetStorageProvider, StoredAsset } from "./types";
import { MAX_UPLOAD_BYTES, isAllowedImageContentType } from "./types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

/**
 * Tickets are minted into this folder, and finalize checks the returned
 * public_id sits under it. Both sides must derive the path the same way, so
 * it lives in one function rather than being spelled out twice.
 */
function userFolder(userId: string): string {
  return `portfolio/${userId}`;
}

/**
 * Constant-time comparison. A plain `===` on a signature leaks, through
 * timing, how many leading characters matched — enough to forge one byte at a
 * time given sufficient attempts.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createCloudinaryAssetProvider(): AssetStorageProvider {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  return {
    name: "cloudinary",

    async createUploadTicket({ userId, contentType, byteSize }) {
      if (!isAllowedImageContentType(contentType)) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }
      if (byteSize <= 0 || byteSize > MAX_UPLOAD_BYTES) {
        throw new Error(`Upload size must be between 1 and ${MAX_UPLOAD_BYTES} bytes.`);
      }

      const timestamp = Math.round(Date.now() / 1000);
      const folder = userFolder(userId);
      const publicId = `${folder}/${timestamp}-${Math.random().toString(36).slice(2, 10)}`;

      const params = {
        timestamp,
        folder,
        public_id: publicId,
        allowed_formats: "jpg,png,webp,gif",
        max_file_size: MAX_UPLOAD_BYTES,
      };

      const signature = cloudinary.utils.api_sign_request(params, apiSecret);

      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        fields: {
          api_key: apiKey,
          timestamp: String(timestamp),
          folder,
          public_id: publicId,
          signature,
          allowed_formats: "jpg,png,webp,gif",
          max_file_size: String(MAX_UPLOAD_BYTES),
        },
        publicId,
        maxBytes: MAX_UPLOAD_BYTES,
      };
    },

    async finalizeUpload({ userId, payload }): Promise<StoredAsset> {
      // The browser uploads directly to Cloudinary and relays the response
      // here. That response is untrusted input: without verification, any
      // authenticated caller could register an arbitrary URL as a
      // provider-backed asset and route around the content-type and size
      // caps enforced on the ticket. Cloudinary signs its upload responses
      // over (public_id, version) precisely so the server can prove
      // authenticity — check it before anything else.
      const result = payload as {
        public_id?: unknown;
        secure_url?: unknown;
        signature?: unknown;
        version?: unknown;
        width?: unknown;
        height?: unknown;
        bytes?: unknown;
        format?: unknown;
      };

      const publicId = typeof result.public_id === "string" ? result.public_id : "";
      const secureUrl = typeof result.secure_url === "string" ? result.secure_url : "";
      const signature = typeof result.signature === "string" ? result.signature : "";
      const version =
        typeof result.version === "number" || typeof result.version === "string"
          ? String(result.version)
          : "";

      if (!publicId || !secureUrl) {
        throw new Error("Cloudinary upload response missing public_id or secure_url.");
      }
      if (!signature || !version) {
        throw new Error("Cloudinary upload response missing signature or version.");
      }

      const expected = cloudinary.utils.api_sign_request(
        { public_id: publicId, version },
        apiSecret,
      );
      if (!timingSafeEqualHex(signature, expected)) {
        throw new Error("Cloudinary upload response failed signature verification.");
      }

      // A valid signature proves Cloudinary produced this response, not that
      // it belongs to the caller. Tickets are minted into `portfolio/<userId>/`,
      // so anything outside that prefix is another user's asset being claimed.
      const expectedPrefix = `${userFolder(userId)}/`;
      if (!publicId.startsWith(expectedPrefix)) {
        throw new Error("Cloudinary asset does not belong to this user.");
      }

      // Only trust the URL Cloudinary's own delivery host serves. `secure_url`
      // arrives in the same signed payload, but the signature does not cover
      // it, so an attacker-supplied host would otherwise survive the check.
      if (!secureUrl.startsWith(`https://res.cloudinary.com/${cloudName}/`)) {
        throw new Error("Cloudinary asset URL is not on the configured delivery host.");
      }

      const format = typeof result.format === "string" ? result.format : "";

      return {
        provider: "cloudinary",
        providerId: publicId,
        url: secureUrl,
        width: typeof result.width === "number" ? result.width : 0,
        height: typeof result.height === "number" ? result.height : 0,
        byteSize: typeof result.bytes === "number" ? result.bytes : 0,
        contentType: format ? `image/${format === "jpg" ? "jpeg" : format}` : "image/jpeg",
      };
    },

    getUrl(asset, opts) {
      const transformations: string[] = [];
      if (opts?.format === "auto") {
        transformations.push("f_auto", "q_auto");
      }
      if (opts?.width) {
        transformations.push(`w_${opts.width}`, "c_limit");
      }
      const transform = transformations.length > 0 ? transformations.join(",") + "/" : "";
      return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}${asset.providerId}`;
    },

    async delete(asset) {
      await cloudinary.uploader.destroy(asset.providerId);
    },
  };
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}
