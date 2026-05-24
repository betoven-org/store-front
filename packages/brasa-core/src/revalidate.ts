import { db } from "./db";
import { tenants } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Notifies the frontend to revalidate cached content.
 * Called after publish/update/delete in admin handlers.
 * Fire-and-forget — errors are logged but don't block the response.
 */
export async function notifyFrontend(
  tenantId: number,
  payload: { paths?: string[]; tags?: string[] },
) {
  try {
    const [tenant] = await db
      .select({
        frontendUrl: tenants.frontendUrl,
        revalidateSecret: tenants.revalidateSecret,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant?.frontendUrl || !tenant?.revalidateSecret) return;

    const url = `${tenant.frontendUrl}/api/revalidate`;

    // Fire-and-forget — don't await in production to avoid blocking
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": tenant.revalidateSecret,
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error(`[revalidate] Failed to notify ${url}:`, err.message);
    });
  } catch (err) {
    console.error("[revalidate] Error:", err);
  }
}
