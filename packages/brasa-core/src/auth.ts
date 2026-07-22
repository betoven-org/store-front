import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { Pool } from "pg";
import { getDb } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export type UserRole = "admin" | "editor" | "author" | "viewer";

export type AuthSession = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
    tenantId: number;
  };
} | null;

// Lazy init to avoid crashing during build when env vars are missing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _betterAuth: any = null;

function getBetterAuth() {
  if (!_betterAuth) {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.NEON_AUTH_COOKIE_SECRET;
    if (!secret) {
      return null;
    }

    _betterAuth = betterAuth({
      secret,
      baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
      database: new Pool({
        connectionString: process.env.DATABASE_URL || process.env.DATABASE_URI || "",
      }),
      emailAndPassword: { enabled: true },
      plugins: [
        emailOTP({
          async sendVerificationOTP({ email, otp, type }) {
            const apiKey = process.env.RESEND_API_KEY;
            if (!apiKey) {
              console.warn("[auth] RESEND_API_KEY not set, OTP:", otp);
              return;
            }
            const from = process.env.RESEND_FROM_EMAIL || "Brasa CMS <noreply@brasa.tech>";
            const subject =
              type === "forget-password"
                ? "Redefinir senha — Brasa CMS"
                : "Código de verificação — Brasa CMS";

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                from,
                to: [email],
                subject,
                html: `<p>Seu código de verificação é: <strong>${otp}</strong></p><p>Este código expira em 10 minutos.</p>`,
              }),
            });
          },
        }),
      ],
    });
  }
  return _betterAuth;
}

// Stub for when Better Auth is not configured (build time, missing env)
const noopHandler = (_req: Request) => new Response(null, { status: 404 });

const _stub = {
  handler: noopHandler,
  api: {
    getSession: async () => null,
  },
};

/** Lazy proxy — safe to import at module level */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const betterAuthInstance = new Proxy({} as any, {
  get(_, prop) {
    const instance = getBetterAuth() ?? _stub;
    return (instance as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Get authenticated session enriched with app-level user data (role, tenantId).
 * Drop-in replacement for the old Neon Auth `auth()`.
 */
export async function auth(req?: Request): Promise<AuthSession> {
  try {
    const instance = getBetterAuth();
    if (!instance) return null;

    // Better Auth needs a Request to read cookies from
    let request = req;
    if (!request) {
      // Server component context — try to read from next/headers
      const { headers, cookies } = await import("next/headers");
      const headerStore = await headers();
      const cookieStore = await cookies();

      const cookieHeader = cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      request = new Request(headerStore.get("x-url") || "http://localhost:3000", {
        headers: {
          cookie: cookieHeader,
          ...Object.fromEntries(headerStore.entries()),
        },
      });
    }

    const session = await instance.api.getSession({ headers: request.headers });

    if (!session?.user?.email) {
      return null;
    }

    const db = getDb();
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
      },
    };
  } catch {
    return null;
  }
}
