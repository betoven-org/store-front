import { createNeonAuth } from "@neondatabase/auth/next/server";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});

export type UserRole = "admin" | "editor" | "author" | "viewer";

export type AuthSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
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
        neonAuthId: session.user.id,
      },
    };
  } catch {
    return null;
  }
}

// Re-export neonAuth for handler and middleware
export { neonAuth };
