import { getCategories } from "@/lib/cms";

export interface Props {
  title?: string;
  showAll?: boolean;
  limit?: number;
}

export default async function CategoryBar({
  title = "Categorias",
  showAll = true,
  limit = 10,
}: Props) {
  const { docs } = await getCategories();
  const categories = docs.slice(0, limit);

  if (categories.length === 0) return null;

  return (
    <nav aria-label={title} className="border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {showAll && (
            <a
              href="/blog"
              className="shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-[#0d61ac] hover:text-white transition-colors"
            >
              Todos
            </a>
          )}
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`/categorias/${cat.slug}`}
              className="shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-[#0d61ac] hover:text-white transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
