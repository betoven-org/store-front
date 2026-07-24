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
    .select({ frontendUrl: tenants.frontendUrl, previewUrl: tenants.previewUrl })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const effectiveUrl = tenant?.previewUrl || tenant?.frontendUrl;
  if (!effectiveUrl) {
    return new NextResponse("frontend_url não configurado", { status: 404 });
  }

  const slug = req.nextUrl.searchParams.get("slug") || "";
  const preview = req.nextUrl.searchParams.get("preview") || "";
  const path = slug.startsWith("/") ? slug : `/${slug}`;

  const target = new URL(path, effectiveUrl);
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

    // Rewrite root-relative URLs so assets, images, scripts and links
    // resolve against the frontend origin, not the CMS proxy.
    const origin = effectiveUrl.replace(/\/+$/, "");

    // src, href, action, poster — single URL attributes
    html = html.replace(
      /(src|href|action|poster)=(["'])\/(?!\/)/g,
      `$1=$2${origin}/`,
    );

    // srcset — may contain multiple entries separated by commas
    html = html.replace(
      /srcset=(["'])([^"']+)\1/g,
      (_match, quote, value) => {
        const fixed = value.replace(/(^|,\s*)\/(?!\/)/g, `$1${origin}/`);
        return `srcset=${quote}${fixed}${quote}`;
      },
    );

    // CSS url() with root-relative paths (background-image, etc.)
    html = html.replace(
      /url\((["']?)\/(?!\/)/g,
      `url($1${origin}/`,
    );

    // Inject <base> tag so any remaining relative URLs resolve to frontend
    html = html.replace(
      /<head([^>]*)>/i,
      `<head$1><base href="${origin}/" />`,
    );

    // Force Next.js dynamic asset loading to use the storefront origin.
    // Must run before any Next.js scripts — prepend to <head> right after <base>.
    const assetPrefixScript = `<script>
(function(){
  var o="${origin}";
  // Next.js webpack public path
  if(typeof __webpack_public_path__!=="undefined")__webpack_public_path__=o+"/";
  // Next.js asset prefix in __NEXT_DATA__
  try{
    var nd=document.getElementById("__NEXT_DATA__");
    if(nd){var d=JSON.parse(nd.textContent);d.assetPrefix=o;nd.textContent=JSON.stringify(d);}
  }catch(e){}
  // Intercept dynamic link/script creation to rewrite /_next/ paths
  var origSetAttr=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(n,v){
    if((n==="href"||n==="src")&&typeof v==="string"&&v.startsWith("/_next/")){
      v=o+v;
    }
    return origSetAttr.call(this,n,v);
  };
})();
</script>`;

    html = html.replace(
      /<base href="[^"]*"\s*\/?>/i,
      (match) => match + assetPrefixScript,
    );

    // Inject brasa-editor.js for inline editing support
    html = html.replace(
      /<\/body>/i,
      `<script src="/brasa-editor.js"></script></body>`,
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
