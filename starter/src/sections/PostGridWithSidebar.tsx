import { getPosts, type PostMode, type PostCard } from "@/lib/cms";
import { formatDate } from "@/lib/format-date";

export interface Props {
  gridTitle: string;
  gridMode?: PostMode;
  gridManualSlugs?: string;
  gridLimit?: number;
  gridColumns?: "2" | "3";
  gridShowCategory?: boolean;
  sidebarTitle: string;
  sidebarMode?: PostMode;
  sidebarManualSlugs?: string;
  sidebarLimit?: number;
  gridViewAllHref?: string;
}

export default async function PostGridWithSidebar({
  gridTitle,
  gridMode = "recent",
  gridLimit = 6,
  gridColumns = "2",
  gridShowCategory = true,
  sidebarTitle,
  sidebarMode = "trending",
  sidebarLimit = 5,
  gridViewAllHref,
}: Props) {
  const [{ docs: gridPosts }, { docs: sidebarPosts }] = await Promise.all([
    getPosts(gridMode, gridLimit),
    getPosts(sidebarMode, sidebarLimit),
  ]);

  if (gridPosts.length === 0) return null;

  const gridColsClass = gridColumns === "3" ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <section className="border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-[#0d61ac]" aria-hidden="true" />
            <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">
              {gridTitle}
            </h2>
            {gridViewAllHref && (
              <a href={gridViewAllHref} className="ml-auto text-sm font-medium text-[#0d61ac] hover:underline">
                Ver todos
              </a>
            )}
          </div>

          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${gridColsClass}`}>
            {gridPosts.map((post) => {
              const imageUrl = post.heroImageUrl ?? post.coverUrl;
              return (
                <article key={post.id}>
                  <a href={`/posts/${post.slug}`} tabIndex={-1} aria-hidden="true">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={post.title}
                        width={640}
                        height={400}
                        loading="lazy"
                        className="aspect-[16/10] w-full rounded-lg object-cover"
                      />
                    )}
                  </a>
                  {gridShowCategory && post.categoryName && (
                    <span className="mt-3 block text-xs font-semibold uppercase text-[#0d61ac]">
                      {post.categoryName}
                    </span>
                  )}
                  <a href={`/posts/${post.slug}`}>
                    <h3 className="mt-1 text-base font-semibold text-gray-900 hover:text-[#0d61ac] line-clamp-2">
                      {post.title}
                    </h3>
                  </a>
                  {post.publishedAt && (
                    <time className="mt-1 block text-xs text-gray-400" dateTime={post.publishedAt}>
                      {formatDate(post.publishedAt)}
                    </time>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        {sidebarPosts.length > 0 && (
          <aside className="mt-8 lg:mt-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 border-b-2 border-[#0d61ac] pb-2">
              {sidebarTitle}
            </p>
            <ol className="divide-y divide-gray-100">
              {sidebarPosts.map((post, i) => (
                <li key={post.id}>
                  <a href={`/posts/${post.slug}`} className="flex items-start gap-3 py-3 group">
                    <span className="shrink-0 text-xl font-bold text-gray-200 w-7 text-right">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#0d61ac]">
                        {post.title}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </section>
  );
}
