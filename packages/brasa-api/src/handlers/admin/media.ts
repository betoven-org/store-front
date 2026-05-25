import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { media } from "@brasa/core/schema";
import { desc, asc, count, ilike, or, and, eq, type SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || "20"))
    );
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type") || "";
    const sort = searchParams.get("sort") || "recent";

    // Build WHERE conditions
    const conditions: SQL[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(media.filename, `%${search}%`),
          ilike(media.alt, `%${search}%`)
        )!
      );
    }

    if (type === "image") {
      conditions.push(ilike(media.mimeType, "image/%"));
    } else if (type === "video") {
      conditions.push(ilike(media.mimeType, "video/%"));
    } else if (type === "pdf") {
      conditions.push(eq(media.mimeType, "application/pdf"));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    // Build ORDER BY
    let orderBy;
    switch (sort) {
      case "oldest":
        orderBy = asc(media.createdAt);
        break;
      case "name":
        orderBy = asc(media.filename);
        break;
      case "size":
        orderBy = desc(media.size);
        break;
      case "recent":
      default:
        orderBy = desc(media.createdAt);
        break;
    }

    const [docs, [total]] = await Promise.all([
      db
        .select()
        .from(media)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(media).where(whereClause),
    ]);

    const totalDocs = total.count;
    const totalPages = Math.ceil(totalDocs / limit);

    return NextResponse.json({ docs, totalDocs, totalPages, page });
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json(
      { error: "Erro ao listar media" },
      { status: 500 }
    );
  }
}
