export interface Props {
  image: string;
  alt: string;
  title?: string;
  description?: string;
  backgroundColor?: string;
  href?: string;
  height?: "small" | "medium" | "large";
}

const HEIGHT: Record<string, string> = {
  small: "h-32 md:h-40",
  medium: "h-48 md:h-64",
  large: "h-64 md:h-80",
};

export default function Banner({
  image,
  alt,
  title,
  description,
  backgroundColor,
  href,
  height = "medium",
}: Props) {
  const content = (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${HEIGHT[height]}`}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      {(title || description) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-4 text-center text-white">
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && <p className="mt-2 text-sm">{description}</p>}
        </div>
      )}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-4">
      {href ? <a href={href}>{content}</a> : content}
    </section>
  );
}
