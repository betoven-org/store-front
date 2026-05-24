import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { db } from "@brasa/core/db";
import { authors } from "@brasa/core/schema";
import { eq, asc } from "drizzle-orm";

export const GET = withApiKey(async ({ tenantId }) => {
  const rows = await db.query.authors.findMany({
    where: eq(authors.tenantId, tenantId),
    orderBy: [asc(authors.name)],
    with: { avatar: true },
  });

  return NextResponse.json({
    docs: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      bio: r.bio,
      avatar: r.avatar ? { url: r.avatar.url, alt: r.avatar.alt } : null,
    })),
  });
});
