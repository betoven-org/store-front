import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { posts, tenants } from "@brasa/core/schema";
import { eq, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  const tenantId = await getTenantId();

  const [post] = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(and(eq(posts.id, Number(id)), eq(posts.tenantId, tenantId)))
    .limit(1);

  if (!post) return new NextResponse("Post não encontrado", { status: 404 });

  const [tenant] = await db
    .select({ frontendUrl: tenants.frontendUrl })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.frontendUrl)
    return new NextResponse("frontend_url não configurado", { status: 404 });

  const target = new URL(`/posts/${post.slug}`, tenant.frontendUrl);

  try {
    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "BrasaCMS-Preview/1.0", Accept: "text/html" },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new NextResponse(`Storefront retornou ${upstream.status}`, { status: 502 });
    }

    let html = await upstream.text();

    const origin = tenant.frontendUrl.replace(/\/+$/, "");
    html = html.replace(
      /(src|href|action|poster)=(["'])\/(?!\/)/g,
      `$1=$2${origin}/`,
    );
    html = html.replace(
      /srcset=(["'])([^"']+)\1/g,
      (_match, quote, value) => {
        const fixed = value.replace(/(^|,\s*)\/(?!\/)/g, `$1${origin}/`);
        return `srcset=${quote}${fixed}${quote}`;
      },
    );

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new NextResponse(
      `Erro ao acessar storefront: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 502 },
    );
  }
}
