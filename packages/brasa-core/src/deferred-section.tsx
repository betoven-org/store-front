"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type DeferredSectionProps = {
  /** The section block data (component, props, id) */
  section: {
    id: string;
    component: string;
    props: Record<string, unknown>;
    loaderData?: unknown;
  };
  /** CMS base URL */
  cmsUrl: string;
  /** CMS API key */
  apiKey: string;
  /** Render the section component with resolved data */
  renderSection: (section: {
    id: string;
    component: string;
    props: Record<string, unknown>;
    loaderData?: unknown;
  }) => ReactNode;
  /** Placeholder shown while section is not yet visible or loading */
  fallback?: ReactNode;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
};

/**
 * DeferredSection — Lazy loads a section when it scrolls into view.
 *
 * Usage in SectionRenderer:
 * ```tsx
 * if (block.deferred) {
 *   return (
 *     <DeferredSection
 *       key={block.id}
 *       section={block}
 *       cmsUrl={CMS_URL}
 *       apiKey={CMS_API_KEY}
 *       renderSection={(resolved) => <SectionComponent {...resolved.props} loaderData={resolved.loaderData} />}
 *       fallback={<div className="h-48 animate-pulse bg-muted" />}
 *     />
 *   );
 * }
 * ```
 */
export function DeferredSection({
  section,
  cmsUrl,
  apiKey,
  renderSection,
  fallback,
  rootMargin = "200px",
}: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [resolved, setResolved] = useState<typeof section | null>(null);
  const [error, setError] = useState(false);

  // Observe visibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Fetch section data when visible
  useEffect(() => {
    if (!isVisible || resolved) return;

    const controller = new AbortController();

    fetch(`${cmsUrl}/api/v1/sections/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ section }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setResolved(data))
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[DeferredSection] Failed to resolve:", section.component, err);
          setError(true);
        }
      });

    return () => controller.abort();
  }, [isVisible, resolved, cmsUrl, apiKey, section]);

  // Not yet visible — show placeholder
  if (!isVisible) {
    return (
      <div ref={ref} data-section-id={section.id} data-deferred>
        {fallback ?? <div style={{ minHeight: "12rem" }} />}
      </div>
    );
  }

  // Loading
  if (!resolved && !error) {
    return (
      <div ref={ref} data-section-id={section.id} data-deferred="loading">
        {fallback ?? <div style={{ minHeight: "12rem" }} className="animate-pulse bg-muted" />}
      </div>
    );
  }

  // Error — render with whatever data we have (props without loaderData)
  if (error) {
    return (
      <div ref={ref} data-section-id={section.id} data-deferred="error">
        {renderSection({ ...section, loaderData: null })}
      </div>
    );
  }

  // Resolved — render the full section
  return (
    <div ref={ref} data-section-id={section.id} data-deferred="resolved">
      {renderSection(resolved!)}
    </div>
  );
}
