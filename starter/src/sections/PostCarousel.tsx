import { getPosts, type PostMode } from "@/lib/cms";

export interface Props {
  title: string;
  subtitle?: string;
  mode?: PostMode;
  manualSlugs?: string;
  limit?: number;
  showCategory?: boolean;
  viewAllHref?: string;
}

export default async function PostCarousel({
  title,
  mode = "recent",
  limit = 5,
  showCategory = true,
  viewAllHref,
}: Props) {
  const { docs: posts } = await getPosts(mode, limit);

  if (posts.length === 0) return null;

  return (
    <section className="border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-[#0d61ac]" aria-hidden="true" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">
            {title}
          </h2>
          {viewAllHref && (
            <a
              href={viewAllHref}
              className="ml-auto shrink-0 text-sm font-medium text-[#0d61ac] hover:underline"
            >
              Ver todos
            </a>
          )}
        </div>

        <ol className="divide-y divide-gray-100">
          {posts.map((post, i) => (
            <li key={post.id}>
              <a
                href={`/posts/${post.slug}`}
                className="flex items-start gap-4 py-3 group"
              >
                <span className="shrink-0 text-2xl font-bold text-gray-200 w-8 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  {showCategory && post.categoryName && (
                    <p className="text-xs text-[#0d61ac] font-medium mb-1">
                      {post.categoryName}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#0d61ac] transition-colors">
                    {post.title}
                  </p>
                  {post.readingTimeMinutes && (
                    <p className="text-xs text-gray-400 mt-1">
                      {post.readingTimeMinutes} min de leitura
                    </p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
