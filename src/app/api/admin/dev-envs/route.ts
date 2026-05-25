import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * GET /api/admin/dev-envs — Generates env vars for the frontend dev environment.
 * The dev copies these into their .env and runs `pnpm dev` — everything connects.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const [tenant] = await db
    .select({
      slug: tenants.slug,
      apiKey: tenants.apiKey,
      revalidateSecret: tenants.revalidateSecret,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant nao encontrado" }, { status: 404 });
  }

  const cmsUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://cms.brasa.tech";
  const dbUri = process.env.DATABASE_URI || "";

  const envs = [
    `# Brasa CMS — Ambiente de desenvolvimento`,
    `# Projeto: ${tenant.slug}`,
    `# Gerado em: ${new Date().toISOString()}`,
    ``,
    `# Conexao com o CMS`,
    `CMS_URL=${cmsUrl}`,
    `CMS_API_KEY=${tenant.apiKey || ""}`,
    `CMS_PREVIEW_SECRET=${tenant.revalidateSecret || ""}`,
    ``,
    `# Banco de dados (mesmo do CMS)`,
    `DATABASE_URI=${dbUri}`,
    ``,
    `# Frontend local`,
    `NEXT_PUBLIC_SITE_URL=http://localhost:3001`,
  ].join("\n");

  return NextResponse.json({
    envs,
    tenant: tenant.slug,
    cmsUrl,
  });
}
