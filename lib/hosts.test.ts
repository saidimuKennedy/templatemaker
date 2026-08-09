import { describe, expect, it, vi } from "vitest";
import {
  appOriginPublishedRedirect,
  buildPublishedSiteUrl,
  buildSiteOriginCsp,
  extractSiteSlug,
  isPlatformPath,
  siteOriginRewritePath,
} from "@/lib/hosts";

describe("host routing helpers", () => {
  it("extracts the slug from a site host", () => {
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    expect(extractSiteSlug("alice.sites.localhost:3000")).toBe("alice");
    expect(extractSiteSlug("sites.localhost:3000")).toBeNull();
  });

  it("rewrites site-origin paths to internal published routes", () => {
    expect(siteOriginRewritePath("alice", "/")).toBe("/p/alice");
    expect(siteOriginRewritePath("alice", "/work")).toBe("/p/alice/work");
    expect(siteOriginRewritePath("alice", "/embed")).toBe("/embed/alice");
    expect(siteOriginRewritePath("alice", "/embed/work")).toBe("/embed/alice/work");
  });

  it("404s platform paths on the site origin", () => {
    expect(isPlatformPath("/dashboard")).toBe(true);
    expect(isPlatformPath("/editor/abc")).toBe(true);
    expect(isPlatformPath("/login")).toBe(true);
    expect(isPlatformPath("/api/records")).toBe(true);
    expect(isPlatformPath("/work")).toBe(false);
  });

  it("maps app-origin published URLs to site-origin targets", () => {
    expect(appOriginPublishedRedirect("/p/alice")).toEqual({
      slug: "alice",
      sitePath: "",
    });
    expect(appOriginPublishedRedirect("/p/alice/work")).toEqual({
      slug: "alice",
      sitePath: "/work",
    });
    expect(appOriginPublishedRedirect("/embed/alice/work")).toEqual({
      slug: "alice",
      sitePath: "/embed/work",
    });
  });

  it("builds published URLs from slug and path", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SITES_HOST", "sites.localhost:3000");
    expect(buildPublishedSiteUrl("alice")).toBe("http://alice.sites.localhost:3000");
    expect(buildPublishedSiteUrl("alice", "/work")).toBe(
      "http://alice.sites.localhost:3000/work",
    );
    vi.unstubAllEnvs();
  });

  describe("buildSiteOriginCsp", () => {
    it("allows inline style attributes", () => {
      // Node styles render as `style="..."` attributes. A nonce covers <style>
      // ELEMENTS only; without style-src-attr every node loses its styling and
      // published pages render unstyled while external CSS still loads.
      expect(buildSiteOriginCsp("abc123", false)).toContain(
        "style-src-attr 'unsafe-inline'",
      );
    });

    it("nonces the injected stylesheet and blocks framing by default", () => {
      const csp = buildSiteOriginCsp("abc123", false);
      expect(csp).toContain("style-src 'self' 'nonce-abc123'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it("permits framing on the embed surface only", () => {
      expect(buildSiteOriginCsp("abc123", true)).toContain("frame-ancestors *");
    });
  });
});
