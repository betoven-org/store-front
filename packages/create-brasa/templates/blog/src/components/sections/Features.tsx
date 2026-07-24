type Feature = {
  /** @title Titulo */
  title: string;
  /** @title Descricao */
  description: string;
  /** @title Icone @format icon */
  icon?: string;
};

type Props = {
  /** @title Titulo da secao */
  title: string;
  /** @title Subtitulo */
  subtitle?: string;
  /** @title Features */
  items: Feature[];
};

const ICON_MAP: Record<string, string> = {
  zap: "⚡", star: "⭐", heart: "❤️", shield: "🛡️", check: "✅",
  globe: "🌍", lock: "🔒", truck: "🚚", award: "🏆", gift: "🎁",
};

export default function Features({ title, subtitle, items = [] }: Props) {
  return (
    <div className="bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-3 text-gray-500">{subtitle}</p>}
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-left">
              {item.icon && (
                <span className="text-2xl">{ICON_MAP[item.icon] || "✦"}</span>
              )}
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
