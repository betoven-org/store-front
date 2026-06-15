import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db as appDb } from "@/db";
import { experiments, flags, flagVariants } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const tenantId = await getTenantId();
  const rows = await appDb.query.experiments.findMany({
    where: eq(experiments.tenantId, tenantId),
    orderBy: [desc(experiments.createdAt)],
    with: {
      flag: { with: { variants: true } },
      results: true,
    },
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
  const { name, description, type = "section", goal, variants } = body as {
    name: string;
    description?: string;
    type?: string;
    goal?: string;
    variants?: Array<{ name: string; value: unknown; weight: number }>;
  };

  if (!name) {
    return NextResponse.json({ error: "name e obrigatorio" }, { status: 400 });
  }

  // Create a multivariate flag for this experiment
  const flagKey = `exp_${name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}_${Date.now()}`;

  const [flag] = await appDb
    .insert(flags)
    .values({
      tenantId,
      name: `Experiment: ${name}`,
      key: flagKey,
      type: "multivariate",
      enabled: false, // starts disabled until experiment is activated
    })
    .returning();

  // Create variants with random matcher (traffic split)
  const experimentVariants = variants || [
    { name: "Controle", value: { variant: "control" }, weight: 50 },
    { name: "Variante A", value: { variant: "a" }, weight: 50 },
  ];

  if (experimentVariants.length > 0) {
    await appDb.insert(flagVariants).values(
      experimentVariants.map((v, i) => ({
        flagId: flag.id,
        name: v.name,
        value: v.value,
        weight: v.weight,
        sortOrder: i,
      }))
    );
  }

  // Create experiment
  const [experiment] = await appDb
    .insert(experiments)
    .values({
      tenantId,
      name,
      description: description || null,
      type: type as "page" | "section" | "image" | "message",
      flagId: flag.id,
      goal: goal || null,
    })
    .returning();

  // Return with relations
  const result = await appDb.query.experiments.findFirst({
    where: eq(experiments.id, experiment.id),
    with: {
      flag: { with: { variants: true } },
      results: true,
    },
  });

  return NextResponse.json(result, { status: 201 });
}
