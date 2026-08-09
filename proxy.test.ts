import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function siteRequest(pathname: string, host = "alice.sites.localhost:3000"): NextRequest {
  return new NextRequest(`http://${host}${pathname}`, { headers: { host } });
}

function appRequest(pathname: string, host = "localhost:3000"): NextRequest {
  return new NextRequest(`http://${host}${pathname}`, { headers: { host } });
}

describe("proxy app-runtime routing (Plan 31)", () => {
  it("passes app-runtime API through on the site origin with slug header", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    vi.stubEnv("APP_HOST", "localhost:3000");

    const response = proxy(siteRequest("/api/records/messages"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-site-slug")).toBe("alice");
    vi.unstubAllEnvs();
  });

  it("404s platform API paths on the site origin", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");

    expect(proxy(siteRequest("/api/platform/ping")).status).toBe(404);
    expect(proxy(siteRequest("/dashboard")).status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("404s app-runtime API on the app origin", () => {
    vi.stubEnv("APP_HOST", "localhost:3000");

    expect(proxy(appRequest("/api/records/messages")).status).toBe(404);
    vi.unstubAllEnvs();
  });

  it("does not rewrite app-runtime paths into /p/<slug>/…", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");

    const response = proxy(siteRequest("/api/records/messages"));
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    vi.unstubAllEnvs();
  });
});
