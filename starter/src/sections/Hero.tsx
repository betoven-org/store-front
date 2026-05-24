export interface Props {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  align?: "left" | "center" | "right";
  cta?: { label: string; href: string };
  dark?: boolean;
}

const ALIGN: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export default function Hero({
  title,
  subtitle,
  backgroundImage,
  align = "center",
  cta,
  dark = false,
}: Props) {
  const textColor = dark ? "text-white" : "text-gray-900";

  return (
    <section
      className="relative flex min-h-[400px] items-center justify-center bg-cover bg-center px-4 py-16"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {backgroundImage && dark && (
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      )}

      <div className={`relative z-10 flex max-w-3xl flex-col ${ALIGN[align]}`}>
        <h1 className={`text-4xl font-bold lg:text-5xl ${textColor}`}>{title}</h1>
        {subtitle && (
          <p className={`mt-4 text-lg ${dark ? "text-gray-200" : "text-gray-600"}`}>
            {subtitle}
          </p>
        )}
        {cta && (
          <a
            href={cta.href}
            className="mt-6 inline-block rounded-lg bg-[#0d61ac] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0a4f8a] transition-colors"
          >
            {cta.label}
          </a>
        )}
      </div>
    </section>
  );
}
