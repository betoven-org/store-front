import { NextRequest, NextResponse } from "next/server";
import { db } from "@brasa/core/db";
import { tenants, users, siteSettings } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const MASTER_KEY = process.env.MASTER_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TENANT_BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || "brasa.tech";

function generateKey(prefix: string, bytes = 24) {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

async function registerVercelDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return { ok: false, error: "VERCEL_TOKEN or VERCEL_PROJECT_ID not configured" };
  }

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: "Unknown error" } }));
    return { ok: false, error: err.error?.message || `Vercel API ${res.status}` };
  }

  return { ok: true };
}

export async function POST(req: NextRequest) {
  // Auth: master key only
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!MASTER_KEY || token !== MASTER_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, slug, domain, adminEmail, adminPassword } = body as {
    name?: string;
    slug?: string;
    domain?: string;
    adminEmail?: string;
    adminPassword?: string;
  };

  if (!name || !slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 },
    );
  }

  // Check slug uniqueness
  const existing = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Slug already taken" },
      { status: 409 },
    );
  }

  const apiKey = generateKey("brs");
  const revalidateSecret = generateKey("rv", 16);

  const subdomain = slug;
  const tenantDomain = `${subdomain}.${TENANT_BASE_DOMAIN}`;

  const [tenant] = await db
    .insert(tenants)
    .values({
      name,
      slug,
      domain: domain || null,
      subdomain,
      frontendUrl: `https://${tenantDomain}`,
      apiKey,
      revalidateSecret,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  // Create default site settings
  await db.insert(siteSettings).values({
    tenantId: tenant.id,
    siteName: name,
  });

  // Register subdomain on Vercel (non-blocking — tenant is created even if this fails)
  const vercelResult = await registerVercelDomain(tenantDomain);

  // Create admin user if credentials provided
  let adminUser = null;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning({ id: users.id, email: users.email });
    adminUser = user;
  }

  return NextResponse.json(
    {
      tenantId: tenant.id,
      slug: tenant.slug,
      apiKey,
      revalidateSecret,
      subdomain: tenantDomain,
      vercelDomain: vercelResult,
      adminUser,
    },
    { status: 201 },
  );
}
