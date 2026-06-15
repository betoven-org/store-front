import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { loaderRegistry } from "@/lib/loaders";

/**
 * POST /api/v1/invoke
 *
 * Call a single loader from the browser. Type-safe via SDK.
 *
 * Body: { loader: "loadProducts", props: { limit: 10 } }
 * Returns: loader result data
 */
export const POST = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const body = await req.json();
  const { loader, props = {} } = body as {
    loader: string;
    props?: Record<string, unknown>;
  };

  if (!loader) {
    return NextResponse.json({ error: "loader is required" }, { status: 400 });
  }

  const fn = loaderRegistry[loader];
  if (!fn) {
    return NextResponse.json({ error: `Unknown loader: ${loader}` }, { status: 404 });
  }

  try {
    const result = await fn(props, { tenantId });
    return NextResponse.json({
      loader,
      data: result.data,
      cacheTags: result.cacheTags,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error(`[invoke] ${loader} failed:`, err);
    return NextResponse.json({ error: `Loader ${loader} failed` }, { status: 500 });
  }
});
