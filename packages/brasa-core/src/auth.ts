import { createNeonAuth } from "@neondatabase/auth/next/server";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

// Lazy init to avoid crashing during build when env vars are missing
let _neonAuth: ReturnType<typeof createNeonAuth> | null = null;

function getNeonAuth(): ReturnType<typeof createNeonAuth> | null {
  if (!_neonAuth) {
    if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
      return null;
    }
    _neonAuth = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET,
      },
    });
  }
  return _neonAuth;
}

// Stub that returns unauthenticated when Neon Auth is not configured
const noopHandler = (_req: Request) => new Response(null, { status: 404 });
const _neonAuthStub = {
  getSession: async () => ({ data: null }),
  handler: () => ({ GET: noopHandler, POST: noopHandler }),
  handlers: () => ({ GET: noopHandler, POST: noopHandler }),
} as unknown as ReturnType<typeof createNeonAuth>;

// Proxy that lazily initializes neonAuth (falls back to stub if unconfigured)
export const neonAuth = new Proxy({} as ReturnType<typeof createNeonAuth>, {
  get(_, prop) {
    const instance = getNeonAuth() ?? _neonAuthStub;
    return (instance as Record<string | symbol, unknown>)[prop];
  },
});

export type UserRole = "admin" | "editor" | "author" | "viewer";

export type AuthSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    tenantId: number;
    neonAuthId: string;
  };
} | null;

/**
 * Drop-in replacement for the old NextAuth `auth()`.
 * Gets the Neon Auth session and enriches with the user's role from our DB.
 */
export async function auth(): Promise<AuthSession> {
  try {
    const { data: session } = await neonAuth.getSession();

    if (!session?.user?.email) {
      return null;
    }

    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!dbUser) {
      return null;
    }

    return {
      user: {
        id: String(dbUser.id),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        tenantId: dbUser.tenantId,
        neonAuthId: session.user.id,
      },
    };
  } catch {
    return null;
  }
}
