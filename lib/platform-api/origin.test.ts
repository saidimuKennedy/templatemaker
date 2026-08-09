import { describe, expect, it, vi } from "vitest";
import { assertPlatformOrigin, isSiteOrigin, PlatformOriginError } from "@/lib/platform-api/origin";

describe("platform API origin guard", () => {
  it("detects published site origins", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    vi.stubEnv("APP_HOST", "localhost:3000");

    expect(isSiteOrigin("http://alice.sites.localhost:3000")).toBe(true);
    expect(isSiteOrigin("http://localhost:3000")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("rejects site-origin requests to platform API routes", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    vi.stubEnv("APP_HOST", "localhost:3000");

    const request = new Request("http://localhost:3000/api/platform/ping", {
      headers: { origin: "http://alice.sites.localhost:3000" },
    });

    expect(() => assertPlatformOrigin(request)).toThrow(PlatformOriginError);
    vi.unstubAllEnvs();
  });

  it("rejects third-party origins, not just site origins", () => {
    // A denylist of site origins passes every other cross-origin caller.
    // Verified live before this test existed: `Origin: https://attacker.example`
    // reached /api/platform/ping and got 200 with a session cookie attached.
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    vi.stubEnv("APP_HOST", "localhost:3000");

    const request = new Request("http://localhost:3000/api/platform/ping", {
      headers: { origin: "https://attacker.example" },
    });

    expect(() => assertPlatformOrigin(request)).toThrow(PlatformOriginError);
    vi.unstubAllEnvs();
  });

  it("allows the app origin itself", () => {
    vi.stubEnv("APP_HOST", "localhost:3000");

    const request = new Request("http://localhost:3000/api/platform/ping", {
      headers: { origin: "http://localhost:3000" },
    });

    expect(() => assertPlatformOrigin(request)).not.toThrow();
    vi.unstubAllEnvs();
  });

  it("allows app-origin requests without an Origin header", () => {
    vi.stubEnv("APP_HOST", "localhost:3000");

    const request = new Request("http://localhost:3000/api/platform/ping");
    expect(() => assertPlatformOrigin(request)).not.toThrow();
    vi.unstubAllEnvs();
  });
});
