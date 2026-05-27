import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";
import { db } from "@brasa/core/db";
import { tenants } from "@brasa/core/schema";
import { eq } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";

/**
 * Proxy the external storefront preview through the CMS origin,
 * stripping X-Frame-Options so the iframe works.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  const tenantId = await getTenantId();

  const [tenant] = await db
    .select({ frontendUrl: tenants.frontendUrl })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant?.frontendUrl) {
    return new NextResponse("frontend_url não configurado", { status: 404 });
  }

  const slug = req.nextUrl.searchParams.get("slug") || "";
  const preview = req.nextUrl.searchParams.get("preview") || "";
  const path = slug.startsWith("/") ? slug : `/${slug}`;

  const target = new URL(path, tenant.frontendUrl);
  if (preview) target.searchParams.set("preview", preview);
  target.searchParams.set("pageId", id);

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": req.headers.get("user-agent") || "BrasaCMS-Preview/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new NextResponse(
        `Storefront retornou ${upstream.status}`,
        { status: upstream.statusText ? upstream.status : 502 },
      );
    }

    let html = await upstream.text();

    // Rewrite relative asset URLs so they resolve against the frontend
    // origin instead of the CMS proxy. Using <base> breaks Next.js
    // client-side hydration, so we rewrite src/href attributes directly.
    const origin = tenant.frontendUrl.replace(/\/+$/, "");
    html = html.replace(
      /(src|href|action)=(["'])\/_next\//g,
      `$1=$2${origin}/_next/`,
    );
    // Also rewrite srcset entries
    html = html.replace(
      /srcset=(["'])(\/_next\/)/g,
      `srcset=$1${origin}/_next/`,
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new NextResponse(
      `Erro ao acessar storefront: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 502 },
    );
  }
}
