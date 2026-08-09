import { afterEach, describe, expect, it, vi } from "vitest";

describe("SESSION_COOKIE_NAME", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the unprefixed name in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { SESSION_COOKIE_NAME } = await import("@/lib/auth-cookie");
    expect(SESSION_COOKIE_NAME).toBe("auth_session");
  });

  it("uses the __Host- prefix in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { SESSION_COOKIE_NAME } = await import("@/lib/auth-cookie");
    expect(SESSION_COOKIE_NAME).toBe("__Host-auth_session");
  });
});

describe("Lucia session cookie attributes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("emits explicit Set-Cookie attributes with no Domain in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { lucia } = await import("@/lib/auth");
    const cookie = lucia.createSessionCookie("test-session-id");
    const serialized = cookie.serialize();

    expect(cookie.name).toBe("__Host-auth_session");
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("SameSite=Lax");
    expect(serialized).toContain("Path=/");
    expect(serialized).toContain("Secure");
    expect(serialized).not.toMatch(/Domain=/i);
  });

  it("emits explicit Set-Cookie attributes with no Domain in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { lucia } = await import("@/lib/auth");
    const cookie = lucia.createSessionCookie("test-session-id");
    const serialized = cookie.serialize();

    expect(cookie.name).toBe("auth_session");
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("SameSite=Lax");
    expect(serialized).toContain("Path=/");
    expect(serialized).not.toMatch(/Domain=/i);
    expect(serialized).not.toContain("Secure");
  });
});
