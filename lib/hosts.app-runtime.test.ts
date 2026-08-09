import { describe, expect, it, vi } from "vitest";
import {
  APP_RUNTIME_API_PREFIX,
  isAppRuntimeApiPath,
  isPlatformPath,
} from "@/lib/hosts";

describe("app-runtime API path helpers", () => {
  it("identifies app-runtime record routes", () => {
    expect(isAppRuntimeApiPath("/api/records")).toBe(true);
    expect(isAppRuntimeApiPath("/api/records/messages")).toBe(true);
    expect(isAppRuntimeApiPath("/api/records/messages/abc123")).toBe(true);
    expect(isAppRuntimeApiPath("/api/platform/ping")).toBe(false);
    expect(isAppRuntimeApiPath("/api/health")).toBe(false);
  });

  it("excludes app-runtime routes from platform path blocking on site origin", () => {
    expect(isPlatformPath("/api/records/messages")).toBe(false);
    expect(isPlatformPath("/api/portfolios")).toBe(true);
    expect(isPlatformPath("/dashboard")).toBe(true);
  });

  it("uses a slug-free path prefix", () => {
    expect(APP_RUNTIME_API_PREFIX).toBe("/api/records");
    expect(APP_RUNTIME_API_PREFIX).not.toContain("[slug]");
  });
});
