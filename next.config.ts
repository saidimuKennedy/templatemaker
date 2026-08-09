import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Published sites are served from their own origin (Plan 30), reproduced
  // locally as `<slug>.sites.localhost:3000`. That is cross-origin relative to
  // the `localhost` the dev server binds to, and Next blocks cross-origin
  // requests to dev-only assets by default — which silently leaves published
  // pages with no client runtime at all: no HMR, no hydration, no console
  // error. Static pages look perfect; anything with a Plan 29 action is dead.
  // Development only — production serves both origins normally.
  allowedDevOrigins: ["*.sites.localhost"],
};

export default nextConfig;
