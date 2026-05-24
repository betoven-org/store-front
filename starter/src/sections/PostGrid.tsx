import { getPosts, type PostCard, type PostMode } from "@/lib/cms";
import { formatDate } from "@/lib/format-date";

export interface Props {
  title: string;
  subtitle?: string;
  mode?: PostMode;
  manualSlugs?: string;
  limit?: number;
  columns?: "2" | "3" | "4";
  showCategory?: boolean;
  showAuthor?: boolean;
  showReadingTime?: boolean;
  viewAllHref?: string;
}

const COLUMNS_CLASS: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

function PostCardItem({
  post,
  showCategory,
  showAuthor,
  showReadingTime,
}: {
  post: PostCard;
  showCategory: boolean;
  showAuthor: boolean;
  showReadingTime: boolean;
}) {
  const imageUrl = post.heroImageUrl ?? post.coverUrl;

  return (
    <article>
      <a href={`/posts/${post.slug}`} tabIndex={-1} aria-hidden="true">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={post.title}
            width={640}
            height={400}
            className="aspect-[16/10] w-full rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </a>

      <div className="flex flex-col">
        {showCategory && post.categoryName && (
          <span className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#0d61ac]">
            {post.categoryName}
          </span>
        )}

        <a href={`/posts/${post.slug}`}>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900 hover:text-[#0d61ac]">
            {post.title}
          </h3>
        </a>

        <footer className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
          {showAuthor && post.authorName && <span>{post.authorName}</span>}
          {showReadingTime && post.readingTimeMinutes != null && (
            <span>{post.readingTimeMinutes} min</span>
          )}
          {post.publishedAt && (
            <time dateTime={post.publishedAt} className="ml-auto">
              {formatDate(post.publishedAt)}
            </time>
          )}
        </footer>
      </div>
    </article>
  );
}

export default async function PostGrid({
  title,
  mode = "recent",
  limit = 6,
  columns = "3",
  showCategory = true,
  showAuthor = false,
  showReadingTime = true,
  viewAllHref,
}: Props) {
  const { docs: posts } = await getPosts(mode, limit);

  if (posts.length === 0) return null;

  const columnsClass = COLUMNS_CLASS[columns] ?? COLUMNS_CLASS["3"];

  return (
    <section aria-labelledby="post-grid-heading" className="border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-[#0d61ac]" aria-hidden="true" />
          <h2
            id="post-grid-heading"
            className="text-lg font-bold uppercase tracking-wide text-gray-900"
          >
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

        <div className={`grid grid-cols-1 gap-4 ${columnsClass}`}>
          {posts.map((post) => (
            <PostCardItem
              key={post.id}
              post={post}
              showCategory={showCategory}
              showAuthor={showAuthor}
              showReadingTime={showReadingTime}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
