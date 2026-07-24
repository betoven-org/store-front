/**
 * Brasa CMS SDK — typed client for the storefront.
 */

export type SectionBlock = {
  id: string;
  component: string;
  props: Record<string, unknown>;
  loaderData?: unknown;
  deferred?: boolean;
  hidden?: boolean;
};

export type CmsPage = {
  id: number;
  slug: string;
  title: string;
  content: string | null;
  sections: SectionBlock[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
};

function createClient() {
  const baseUrl = (process.env.CMS_URL || "http://localhost:3000").replace(/\/$/, "");
  const apiKey = process.env.CMS_API_KEY || "";

  async function request<T>(
    path: string,
    opts?: { revalidate?: number; draft?: boolean },
  ): Promise<T | null> {
    const { revalidate = 60, draft = false } = opts ?? {};
    const url = new URL(`/api/v1${path}`, baseUrl);
    if (draft) url.searchParams.set("draft", "true");

    try {
      const res = await fetch(url.toString(), {
        headers: { "x-api-key": apiKey },
        next: { revalidate: draft ? 0 : revalidate, tags: [path.split("/")[1] || "cms"] },
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  return {
    pages: {
      async get(slug: string, opts?: { draft?: boolean }): Promise<CmsPage | null> {
        return request<CmsPage>(`/pages/${encodeURIComponent(slug)}`, {
          revalidate: opts?.draft ? 0 : 60,
          draft: opts?.draft,
        });
      },
    },
  };
}

export const cms = createClient();
