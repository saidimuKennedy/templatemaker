import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { prisma } from "@/lib/db";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: SESSION_COOKIE_NAME,
    attributes: {
      // httpOnly is always true — enforced by Lucia defaults, verified in auth-cookie.test.ts.
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      // Never set `domain`. Host-only cookies keep the platform session on
      // the app origin only; a Domain attribute would let sibling hosts
      // receive or shadow it and undo origin isolation (Plan 30).
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
    };
  }
}

export type AuthUser = {
  id: string;
  email: string;
};

export async function getSession(): Promise<{
  user: AuthUser | null;
  session: import("lucia").Session | null;
}> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    return { user: null, session: null };
  }

  const { user, session } = await lucia.validateSession(sessionId);
  if (!user || !session) {
    return { user: null, session: null };
  }

  return {
    user: {
      id: user.id,
      email: (user as { email?: string }).email ?? "",
    },
    session,
  };
}

export async function requireSession() {
  const { user, session } = await getSession();

  if (!user || !session) {
    return null;
  }

  return { user, session };
}
