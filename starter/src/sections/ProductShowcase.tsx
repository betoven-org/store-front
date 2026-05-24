import { getProducts } from "@/lib/cms";

export interface Props {
  title: string;
  mode?: "all" | "featured" | "category" | "manual";
  categorySlug?: string;
  manualSlugs?: string;
  limit?: number;
  columns?: "2" | "3" | "4";
  viewAllHref?: string;
  showDescription?: boolean;
}

const COLS: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

export default async function ProductShowcase({
  title,
  limit = 8,
  columns = "4",
  viewAllHref,
  showDescription = false,
}: Props) {
  const { docs: products } = await getProducts(limit);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-[#0d61ac]" aria-hidden="true" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">{title}</h2>
          {viewAllHref && (
            <a href={viewAllHref} className="ml-auto text-sm font-medium text-[#0d61ac] hover:underline">
              Ver todos
            </a>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-4 ${COLS[columns]}`}>
          {products.map((product) => (
            <article key={product.id}>
              <a href={`/produtos/${product.slug}/p`}>
                {product.image && (
                  <img
                    src={product.image.url}
                    alt={product.image.alt}
                    width={300}
                    height={300}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2 hover:text-[#0d61ac]">
                  {product.name}
                </h3>
              </a>
              {showDescription && product.description && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{product.description}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
