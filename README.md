This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

### Local origins (Plan 30)

Published portfolios are served from a **separate origin** from the
dashboard. In development, use:

| Surface | URL |
|---------|-----|
| App (dashboard, editor, auth) | [http://localhost:3000](http://localhost:3000) |
| Published site for slug `alice` | [http://alice.sites.localhost:3000](http://alice.sites.localhost:3000) |

`*.localhost` resolves in current browsers without a hosts-file entry.

Because the site origin differs from the `localhost` the dev server binds
to, `next.config.ts` must keep `allowedDevOrigins: ["*.sites.localhost"]`.
Without it Next blocks its own dev assets cross-origin and published pages
load with **no client runtime at all** — no HMR, no hydration, and no error
of any kind. Static pages still look correct, so the symptom only shows up
as buttons and actions silently doing nothing.

Configure overrides with environment variables:

```bash
APP_HOST=localhost:3000
SITES_HOST=sites.localhost:3000
NEXT_PUBLIC_SITES_HOST=sites.localhost:3000
```

**Local caveats (not production parity):**

1. **Cookie shadowing** — dev uses the `localhost` suffix for both origins.
   Production uses two registrable domains with no shared parent, so
   cross-origin cookie injection cannot be reproduced locally.
2. **`__Host-` cookie prefix** — requires `Secure`, so the session cookie
   keeps the unprefixed `auth_session` name over plain `http://` in
   development. Production uses `__Host-auth_session`.
3. **`'unsafe-eval'` in the site-origin CSP** — development only, because
   React uses `eval` to rebuild server stack traces. Production omits it.

On the app origin, `/p/{slug}` and `/embed/{slug}` **301 redirect** to the
site origin. Platform routes (`/dashboard`, `/login`, `/api/...`) return
**404** on the site origin.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://vercel.com/docs/app/building-your-application/deploying) for more details.

Configure production hosts via `APP_HOST` and `SITES_HOST` (no hardcoded
domain names in the codebase).
