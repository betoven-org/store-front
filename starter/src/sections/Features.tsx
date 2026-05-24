export interface Props {
  title: string;
  subtitle?: string;
  columns?: "2" | "3" | "4";
  items: { icon?: string; title: string; description?: string }[];
}

const COLS: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
};

export default function Features({ title, subtitle, columns = "3", items }: Props) {
  if (!items?.length) return null;

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}

        <div className={`mt-8 grid grid-cols-1 gap-6 ${COLS[columns]}`}>
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border p-6">
              {item.icon && <span className="text-3xl">{item.icon}</span>}
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
              {item.description && <p className="mt-2 text-sm text-gray-500">{item.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
