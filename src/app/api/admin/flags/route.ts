import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db as appDb } from "@/db";
import { flags, flagVariants } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await appDb.query.flags.findMany({
    where: eq(flags.tenantId, tenantId),
    orderBy: [desc(flags.createdAt)],
    with: { variants: true },
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();
  const body = await req.json();
  const { name, key, type = "boolean", variants: bodyVariants } = body;

  if (!name || !key) {
    return NextResponse.json({ error: "name e key sao obrigatorios" }, { status: 400 });
  }

  // Check key uniqueness
  const existing = await appDb.query.flags.findFirst({
    where: and(eq(flags.tenantId, tenantId), eq(flags.key, key)),
  });
  if (existing) {
    return NextResponse.json({ error: "Ja existe uma flag com essa key" }, { status: 409 });
  }

  const [flag] = await appDb
    .insert(flags)
    .values({ tenantId, name, key, type })
    .returning();

  // Create default variants for boolean flag
  if (type === "boolean" && (!bodyVariants || bodyVariants.length === 0)) {
    await appDb.insert(flagVariants).values([
      { flagId: flag.id, name: "Ativo", value: true, sortOrder: 0 },
      { flagId: flag.id, name: "Inativo", value: false, sortOrder: 1 },
    ]);
  }

  // Create custom variants if provided
  if (bodyVariants && Array.isArray(bodyVariants) && bodyVariants.length > 0) {
    await appDb.insert(flagVariants).values(
      bodyVariants.map((v: { name: string; value: unknown; matcherId?: number; weight?: number }, i: number) => ({
        flagId: flag.id,
        name: v.name,
        value: v.value,
        matcherId: v.matcherId || null,
        weight: v.weight ?? 100,
        sortOrder: i,
      }))
    );
  }

  // Return with variants
  const result = await appDb.query.flags.findFirst({
    where: eq(flags.id, flag.id),
    with: { variants: true },
  });

  return NextResponse.json(result, { status: 201 });
}
