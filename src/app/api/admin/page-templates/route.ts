import { NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { PAGE_TEMPLATES } from "@/lib/page-templates";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  const templates = PAGE_TEMPLATES.map(({ id, name, description, icon, sections }) => ({
    id,
    name,
    description,
    icon,
    sectionsCount: sections.length,
  }));

  return NextResponse.json({ templates });
}
