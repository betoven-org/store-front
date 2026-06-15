import { NextRequest, NextResponse } from "next/server";
import { withApiKey } from "@/lib/api-key";
import { loaderRegistry } from "@/lib/loaders";

type InvokeItem = {
  loader: string;
  props?: Record<string, unknown>;
};

/**
 * POST /api/v1/invoke/batch
 *
 * Call multiple loaders in a single request. All execute in parallel.
 *
 * Body: [
 *   { loader: "loadProducts", props: { limit: 5 } },
 *   { loader: "loadPosts", props: { featured: true } }
 * ]
 * Returns: array of results in same order
 */
export const POST = withApiKey(async ({ tenantId }, req: NextRequest) => {
  const body = await req.json();

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be an array" }, { status: 400 });
  }

  if (body.length > 20) {
    return NextResponse.json({ error: "Max 20 invocations per batch" }, { status: 400 });
  }

  const results = await Promise.all(
    (body as InvokeItem[]).map(async ({ loader, props = {} }) => {
      const fn = loaderRegistry[loader];
      if (!fn) {
        return { loader, error: `Unknown loader: ${loader}`, data: null };
      }

      try {
        const result = await fn(props, { tenantId });
        return { loader, data: result.data, error: null };
      } catch (err) {
        console.error(`[invoke/batch] ${loader} failed:`, err);
        return { loader, data: null, error: `Loader ${loader} failed` };
      }
    })
  );

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
});
