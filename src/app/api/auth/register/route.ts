import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL || process.env.DATABASE_URI;

function generateApiKey(): string {
  return `brs_${crypto.randomBytes(24).toString("base64url")}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  if (!DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { name, email, password, siteName } = body;

  if (!name || !email || !password || !siteName) {
    return NextResponse.json(
      { error: "Todos os campos sao obrigatorios" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter pelo menos 6 caracteres" },
      { status: 400 },
    );
  }

  const sql = neon(DATABASE_URL);
  const slug = slugify(siteName);

  try {
    // Check if email already exists
    const [existingUser] = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;
    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 },
      );
    }

    // Check if slug already exists
    const [existingTenant] = await sql`
      SELECT id FROM tenants WHERE slug = ${slug} LIMIT 1
    `;
    if (existingTenant) {
      return NextResponse.json(
        { error: "Ja existe um site com esse nome. Escolha outro." },
        { status: 409 },
      );
    }

    // Create tenant
    const apiKey = generateApiKey();
    const [tenant] = await sql`
      INSERT INTO tenants (slug, name, api_key)
      VALUES (${slug}, ${siteName}, ${apiKey})
      RETURNING id
    `;
    const tenantId = tenant.id;

    // Create admin user
    const passwordHash = await bcrypt.hash(password, 12);
    await sql`
      INSERT INTO users (tenant_id, name, email, password_hash, role)
      VALUES (${tenantId}, ${name}, ${email}, ${passwordHash}, 'admin')
    `;

    // Create site_settings
    await sql`
      INSERT INTO site_settings (tenant_id, site_name)
      VALUES (${tenantId}, ${siteName})
    `;

    // Create default pages
    const defaultSections = JSON.stringify([
      {
        id: "hero-1",
        component: "HeroPost",
        props: { mode: "featured", showCategory: true, showAuthor: true, showReadingTime: true, sideCount: "4" },
      },
    ]);

    await sql`
      INSERT INTO pages (tenant_id, slug, title, sections) VALUES
      (${tenantId}, 'home', 'Home', ${defaultSections}::jsonb),
      (${tenantId}, 'blog', 'Blog', null),
      (${tenantId}, 'politica-de-privacidade', 'Politica de Privacidade', null)
    `;

    // Create subscription (30-day trial)
    const nextDue = new Date(Date.now() + 30 * 86400000).toISOString();
    await sql`
      INSERT INTO subscriptions (tenant_id, status, next_due_date, grace_days)
      VALUES (${tenantId}, 'active', ${nextDue}, 7)
    `;

    return NextResponse.json({
      success: true,
      tenantId,
      slug,
      message: "Conta criada com sucesso",
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro ao criar conta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
