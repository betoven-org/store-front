import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { db } from "@/db";
import { tenants, users, siteSettings, pages, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const slug = slugify(siteName);

  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 },
      );
    }

    const [existingTenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    if (existingTenant) {
      return NextResponse.json(
        { error: "Ja existe um site com esse nome. Escolha outro." },
        { status: 409 },
      );
    }

    const apiKey = generateApiKey();
    const [tenant] = await db
      .insert(tenants)
      .values({ slug, name: siteName, apiKey })
      .returning({ id: tenants.id });
    const tenantId = tenant.id;

    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(users).values({
      tenantId,
      name,
      email,
      passwordHash,
      role: "admin",
    });

    await db.insert(siteSettings).values({
      tenantId,
      siteName,
    });

    const defaultSections = [
      {
        id: "hero-1",
        component: "HeroPost",
        props: { mode: "featured", showCategory: true, showAuthor: true, showReadingTime: true, sideCount: "4" },
      },
    ];

    await db.insert(pages).values([
      { tenantId, slug: "home", title: "Home", sections: defaultSections },
      { tenantId, slug: "blog", title: "Blog" },
      { tenantId, slug: "politica-de-privacidade", title: "Politica de Privacidade" },
    ]);

    const nextDue = new Date(Date.now() + 7 * 86400000).toISOString();
    await db.insert(subscriptions).values({
      tenantId,
      status: "active",
      nextDueDate: nextDue,
      graceDays: 7,
    });

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
