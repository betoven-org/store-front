import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { redirects } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getTenantId } from "@/lib/tenant";

type CsvRow = {
  from: string;
  to: string;
  type: number;
};

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], errors: ["Arquivo vazio"] };

  // Detect header
  const first = lines[0].toLowerCase();
  const hasHeader =
    first.includes("from") || first.includes("origem") || first.includes("to") || first.includes("destino");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    // Support comma, semicolon, or tab separator
    const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map((p) => p.trim().replace(/^["']|["']$/g, ""));

    if (parts.length < 2) {
      errors.push(`Linha ${i + 1}: esperado ao menos 2 colunas (from, to)`);
      continue;
    }

    const from = parts[0];
    const to = parts[1];
    const type = parts[2] ? Number(parts[2]) : 301;

    if (!from.startsWith("/")) {
      errors.push(`Linha ${i + 1}: origem deve comecar com / (${from})`);
      continue;
    }

    if (!to.startsWith("/") && !to.startsWith("http")) {
      errors.push(`Linha ${i + 1}: destino deve comecar com / ou http (${to})`);
      continue;
    }

    if (type !== 301 && type !== 302) {
      errors.push(`Linha ${i + 1}: tipo deve ser 301 ou 302 (${type})`);
      continue;
    }

    rows.push({ from, to, type });
  }

  return { rows, errors };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const tenantId = await getTenantId();

  const contentType = req.headers.get("content-type") || "";

  let csvText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    const body = await req.json();
    csvText = body.csv;
    if (!csvText) {
      return NextResponse.json({ error: "CSV nao enviado" }, { status: 400 });
    }
  }

  const { rows, errors } = parseCsv(csvText);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Nenhum redirect valido encontrado", errors },
      { status: 400 }
    );
  }

  // Get existing redirects to avoid duplicates
  const existing = await db
    .select({ from: redirects.from })
    .from(redirects)
    .where(eq(redirects.tenantId, tenantId));

  const existingFroms = new Set(existing.map((r) => r.from));

  const newRows = rows.filter((r) => !existingFroms.has(r.from));
  const skipped = rows.length - newRows.length;

  if (newRows.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < newRows.length; i += 100) {
      const batch = newRows.slice(i, i + 100);
      await db.insert(redirects).values(
        batch.map((r) => ({
          tenantId,
          from: r.from,
          to: r.to,
          type: r.type,
        }))
      );
    }
  }

  revalidateTag("redirects");

  return NextResponse.json({
    imported: newRows.length,
    skipped,
    errors,
    total: rows.length,
  });
}
