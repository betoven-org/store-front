type Props = {
  /** @title Titulo */
  title: string;
  /** @title Subtitulo */
  subtitle?: string;
  /** @title Texto do botao */
  ctaText?: string;
  /** @title Link do botao */
  ctaHref?: string;
  /** @title Variante @options light,dark,gradient */
  variant?: "light" | "dark" | "gradient";
};

export default function CTA({ title, subtitle, ctaText = "Saiba mais", ctaHref = "#", variant = "light" }: Props) {
  const bg =
    variant === "dark" ? "bg-gray-900 text-white"
    : variant === "gradient" ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
    : "bg-gray-50 text-gray-900";

  return (
    <div className={`px-6 py-20 text-center ${bg}`}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-bold">{title}</h2>
        {subtitle && <p className="mt-3 opacity-80">{subtitle}</p>}
        <a
          href={ctaHref}
          className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow hover:bg-gray-100"
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
}
