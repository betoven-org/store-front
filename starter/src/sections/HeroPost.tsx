import { getFeaturedPost, getPosts, type PostCard } from "@/lib/cms";

export interface Props {
  mode?: "featured" | "manual";
  manualSlug?: string;
  showCategory?: boolean;
  showAuthor?: boolean;
  showReadingTime?: boolean;
  sideCount?: "3" | "4" | "5";
}

export default async function HeroPost({
  showCategory = true,
  showAuthor = true,
  showReadingTime = true,
  sideCount = "4",
}: Props) {
  const sideLimit = parseInt(sideCount, 10);

  const [featured, { docs: recentPosts }] = await Promise.all([
    getFeaturedPost(),
    getPosts("recent", sideLimit + 1),
  ]);

  if (!featured) return null;

  const sidePosts = recentPosts
    .filter((p) => p.slug !== featured.slug)
    .slice(0, sideLimit);

  const featuredImageUrl = featured.coverUrl ?? featured.heroImageUrl;
  const hasMetaBottom = showAuthor || showReadingTime;

  return (
    <section aria-label="Post em destaque" className="w-full py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <a href={`/posts/${featured.slug}`} className="block group">
              {featuredImageUrl ? (
                <img
                  src={featuredImageUrl}
                  alt={featured.title}
                  width={864}
                  height={540}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full aspect-[16/10] object-cover rounded-lg group-hover:opacity-95 transition-opacity duration-200"
                />
              ) : (
                <div className="w-full aspect-[16/10] rounded-lg bg-[#0d61ac]" aria-hidden="true" />
              )}
            </a>

            {showCategory && featured.categoryName && (
              <p className="text-xs font-semibold text-[#0d61ac] uppercase tracking-wide mt-4">
                {featured.categoryName}
              </p>
            )}

            <h2 className="mt-2">
              <a
                href={`/posts/${featured.slug}`}
                className="text-2xl lg:text-3xl font-bold text-gray-900 hover:text-[#0d61ac] line-clamp-3 transition-colors duration-150"
              >
                {featured.title}
              </a>
            </h2>

            {featured.excerpt && (
              <p className="text-base text-gray-500 mt-2 line-clamp-2">{featured.excerpt}</p>
            )}

            {hasMetaBottom && (
              <p className="text-sm text-gray-400 mt-3 flex items-center gap-2">
                {showAuthor && featured.authorName && <span>{featured.authorName}</span>}
                {showAuthor && featured.authorName && showReadingTime && featured.readingTimeMinutes && (
                  <span aria-hidden="true">&middot;</span>
                )}
                {showReadingTime && featured.readingTimeMinutes && (
                  <span>{featured.readingTimeMinutes} min de leitura</span>
                )}
              </p>
            )}
          </div>

          {sidePosts.length > 0 && (
            <aside aria-label="Mais noticias" className="lg:col-span-1 mt-8 lg:mt-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 border-b-2 border-[#0d61ac] pb-2">
                Mais Noticias
              </p>
              <ul>
                {sidePosts.map((post) => {
                  const sideImageUrl = post.coverUrl ?? post.heroImageUrl;
                  return (
                    <li key={post.slug} className="border-b border-gray-100 last:border-0">
                      <a href={`/posts/${post.slug}`} className="flex gap-3 py-3 group">
                        {sideImageUrl ? (
                          <img
                            src={sideImageUrl}
                            alt={post.title}
                            width={80}
                            height={80}
                            loading="lazy"
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-[#0d61ac] flex-shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          {post.categoryName && (
                            <p className="text-xs text-[#0d61ac] font-medium mb-1">{post.categoryName}</p>
                          )}
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-[#0d61ac] transition-colors duration-150">
                            {post.title}
                          </p>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
