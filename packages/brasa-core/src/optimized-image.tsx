/**
 * OptimizedImage — Image component with automatic srcset, format negotiation,
 * and quality presets via the CMS image optimization endpoint.
 *
 * Usage:
 * ```tsx
 * import { OptimizedImage } from "@brasa/core/optimized-image";
 *
 * <OptimizedImage
 *   src="https://...supabase.co/storage/v1/object/public/..."
 *   alt="Product photo"
 *   width={800}
 *   height={600}
 *   quality="high"
 *   priority
 * />
 * ```
 */

type Quality = "low" | "medium" | "high" | "original" | number;
type Fit = "cover" | "contain" | "fill" | "inside" | "outside";

type OptimizedImageProps = {
  /** Source image URL */
  src: string;
  /** Alt text (required for accessibility) */
  alt: string;
  /** Display width */
  width: number;
  /** Display height */
  height?: number;
  /** Quality preset or 1-100 */
  quality?: Quality;
  /** Object fit */
  fit?: Fit;
  /** High priority — adds preload link and eager loading */
  priority?: boolean;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** Additional CSS classes */
  className?: string;
  /** Loading strategy */
  loading?: "lazy" | "eager";
  /** CMS base URL (defaults to env CMS_URL or window origin) */
  cmsUrl?: string;
};

/** Default srcset widths for responsive images */
const SRCSET_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];

function buildImageUrl(
  cmsUrl: string,
  src: string,
  width: number,
  quality: Quality = "high",
  fit: Fit = "cover"
): string {
  const params = new URLSearchParams({
    src,
    w: String(width),
    q: String(quality),
    f: "auto",
    fit,
  });
  return `${cmsUrl}/api/v1/image?${params}`;
}

function buildSrcSet(
  cmsUrl: string,
  src: string,
  baseWidth: number,
  quality: Quality = "high",
  fit: Fit = "cover"
): string {
  // Generate 1x and 2x for the base width
  const widths = [baseWidth, baseWidth * 2].filter((w) => w <= 3840);

  // Also include responsive breakpoints smaller than baseWidth
  const responsive = SRCSET_WIDTHS.filter((w) => w < baseWidth);

  const allWidths = [...new Set([...responsive, ...widths])].sort((a, b) => a - b);

  return allWidths
    .map((w) => `${buildImageUrl(cmsUrl, src, w, quality, fit)} ${w}w`)
    .join(", ");
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = "high",
  fit = "cover",
  priority = false,
  sizes,
  className,
  loading,
  cmsUrl,
}: OptimizedImageProps) {
  const base =
    cmsUrl ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CMS_URL) ||
    (typeof process !== "undefined" && process.env?.CMS_URL) ||
    "";

  // If no CMS URL, fall back to raw src
  if (!base) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading ?? (priority ? "eager" : "lazy")}
        decoding={priority ? "sync" : "async"}
      />
    );
  }

  const optimizedSrc = buildImageUrl(base, src, width, quality, fit);
  const srcSet = buildSrcSet(base, src, width, quality, fit);
  const defaultSizes = sizes || `(max-width: ${width}px) 100vw, ${width}px`;

  return (
    <>
      {priority && (
        <link
          rel="preload"
          as="image"
          href={optimizedSrc}
          imageSrcSet={srcSet}
          imageSizes={defaultSizes}
        />
      )}
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={defaultSizes}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading ?? (priority ? "eager" : "lazy")}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : undefined}
      />
    </>
  );
}

/** Helper to build an optimized image URL programmatically */
export function getImageUrl(
  cmsUrl: string,
  src: string,
  opts?: { width?: number; quality?: Quality; fit?: Fit }
): string {
  return buildImageUrl(
    cmsUrl,
    src,
    opts?.width || 800,
    opts?.quality || "high",
    opts?.fit || "cover"
  );
}
