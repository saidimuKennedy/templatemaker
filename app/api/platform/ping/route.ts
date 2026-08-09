import { NextResponse } from "next/server";
import { assertPlatformOrigin, PlatformOriginError } from "@/lib/platform-api/origin";

/**
 * Platform-only probe route. Rejects requests from published site origins.
 * App-runtime routes never read the platform session cookie — this route
 * demonstrates the inverse: platform API rejects site origins.
 */
export async function GET(request: Request) {
  try {
    assertPlatformOrigin(request);
  } catch (error) {
    if (error instanceof PlatformOriginError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, surface: "platform" });
}
