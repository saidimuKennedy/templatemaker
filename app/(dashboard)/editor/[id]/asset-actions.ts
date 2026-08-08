"use server";

import { redirect } from "next/navigation";
import { resolveAssetStorageProvider, tryResolveAssetStorageProvider } from "@/builder/assets/provider";
import type { StoredAsset } from "@/builder/assets/types";
import { MAX_UPLOAD_BYTES, isAllowedImageContentType } from "@/builder/assets/types";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAuthenticatedUser() {
  const { user, session } = await getSession();
  if (!user || !session) {
    redirect("/login");
  }
  return user;
}

export type AssetRecord = {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
  contentType: string;
  provider: string;
  providerId: string;
  createdAt: string;
};

function toAssetRecord(asset: {
  id: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
  contentType: string;
  provider: string;
  providerId: string;
  createdAt: Date;
}): AssetRecord {
  return {
    id: asset.id,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    byteSize: asset.byteSize,
    contentType: asset.contentType,
    provider: asset.provider,
    providerId: asset.providerId,
    createdAt: asset.createdAt.toISOString(),
  };
}

export async function createAssetUploadTicket(input: {
  contentType: string;
  byteSize: number;
}): Promise<
  | { success: true; ticket: { uploadUrl: string; fields: Record<string, string>; publicId: string; maxBytes: number } }
  | { success: false; error: string }
> {
  const user = await requireAuthenticatedUser();

  if (!isAllowedImageContentType(input.contentType)) {
    return { success: false, error: "Unsupported image type." };
  }
  if (input.byteSize <= 0 || input.byteSize > MAX_UPLOAD_BYTES) {
    return { success: false, error: `Image must be between 1 and ${MAX_UPLOAD_BYTES} bytes.` };
  }

  try {
    const provider = resolveAssetStorageProvider();
    const ticket = await provider.createUploadTicket({
      userId: user.id,
      contentType: input.contentType,
      byteSize: input.byteSize,
    });
    return { success: true, ticket };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not create upload ticket.",
    };
  }
}

export async function finalizeAssetUpload(payload: unknown): Promise<
  | { success: true; asset: AssetRecord }
  | { success: false; error: string }
> {
  const user = await requireAuthenticatedUser();

  try {
    const provider = resolveAssetStorageProvider();
    const stored: StoredAsset = await provider.finalizeUpload({ userId: user.id, payload });

    const asset = await prisma.asset.create({
      data: {
        userId: user.id,
        provider: stored.provider,
        providerId: stored.providerId,
        url: stored.url,
        width: stored.width,
        height: stored.height,
        byteSize: stored.byteSize,
        contentType: stored.contentType,
      },
    });

    return { success: true, asset: toAssetRecord(asset) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not finalize upload.",
    };
  }
}

export async function listUserAssets(): Promise<
  | { success: true; assets: AssetRecord[] }
  | { success: false; error: string }
> {
  const user = await requireAuthenticatedUser();

  const assets = await prisma.asset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, assets: assets.map(toAssetRecord) };
}

export async function deleteUserAsset(assetId: string): Promise<
  | { success: true }
  | { success: false; error: string; usageCount?: number }
> {
  const user = await requireAuthenticatedUser();

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, userId: user.id },
  });

  if (!asset) {
    return { success: false, error: "Asset not found." };
  }

  // Block deletion when referenced in any portfolio content (simple URL scan).
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: user.id },
    select: { id: true, content: true },
  });

  let usageCount = 0;
  for (const portfolio of portfolios) {
    const serialized = JSON.stringify(portfolio.content);
    if (serialized.includes(asset.url) || serialized.includes(asset.providerId)) {
      usageCount += 1;
    }
  }

  if (usageCount > 0) {
    return {
      success: false,
      error: `Asset is used in ${usageCount} portfolio(s). Remove references before deleting.`,
      usageCount,
    };
  }

  try {
    const provider = tryResolveAssetStorageProvider();
    if (provider) {
      await provider.delete({
        provider: asset.provider,
        providerId: asset.providerId,
        url: asset.url,
        width: asset.width,
        height: asset.height,
        byteSize: asset.byteSize,
        contentType: asset.contentType,
      });
    }
    await prisma.asset.delete({ where: { id: asset.id } });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not delete asset.",
    };
  }
}

export async function isAssetUploadConfigured(): Promise<boolean> {
  return tryResolveAssetStorageProvider() !== null;
}
