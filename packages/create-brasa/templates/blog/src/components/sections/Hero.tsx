type Props = {
  /** @title Titulo principal */
  title: string;
  /** @title Subtitulo */
  subtitle?: string;
  /** @title Texto do botao */
  ctaText?: string;
  /** @title Link do botao */
  ctaHref?: string;
  /** @title Imagem de fundo @format image */
  backgroundImage?: string;
  /** @title Modo escuro */
  dark?: boolean;
};

export default function Hero({ title, subtitle, ctaText, ctaHref, backgroundImage, dark }: Props) {
  return (
    <div
      className={`relative flex min-h-[480px] items-center justify-center px-6 py-24 text-center ${
        dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"
      }`}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/40" />}
      <div className="relative z-10 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-lg opacity-80">{subtitle}</p>}
        {ctaText && (
          <a
            href={ctaHref || "#"}
            className="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            {ctaText}
          </a>
        )}
      </div>
    </div>
  );
}
