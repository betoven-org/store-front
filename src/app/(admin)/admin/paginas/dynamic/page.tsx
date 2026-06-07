"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell, BrasaPageLoader } from "@brasa/admin";

/* ── Device configs (same as page editor) ─────────────────────────── */

const DEVICE_CONFIGS = {
  desktop: { width: 1440, height: 900, frame: false },
  tablet: { width: 768, height: 1024, frame: true },
  mobile: { width: 375, height: 812, frame: true },
} as const;

type DeviceKey = keyof typeof DEVICE_CONFIGS;

/* ── Preview Frame (same pattern as page editor) ──────────────────── */

function PreviewFrame({
  iframeRef,
  src,
  device,
  title,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  src: string;
  device: DeviceKey;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const config = DEVICE_CONFIGS[device];

  useEffect(() => {
    if (iframeRef.current && src) iframeRef.current.src = src;
  }, [src, iframeRef]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    function calc() {
      const s = Math.min(container.clientWidth / config.width, 1);
      setScale(s);
    }
    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(container);
    return () => observer.disconnect();
  }, [device, config.width]);

  if (!config.frame) {
    const iframeHeight = scale > 0 ? `${100 / scale}%` : "100%";
    return (
      <div ref={containerRef} className="flex-1 bg-accent overflow-hidden">
        <div style={{ width: config.width, height: "100vh", transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <iframe ref={iframeRef} src={src} className="border-0 bg-card" style={{ width: config.width, height: iframeHeight }} title={title} />
        </div>
      </div>
    );
  }

  const frameHeight = scale > 0 ? `${100 / scale}%` : "100%";
  return (
    <div ref={containerRef} className="flex-1 bg-accent overflow-hidden flex justify-center">
      <div style={{ width: config.width, height: "100vh", transform: `scale(${scale})`, transformOrigin: "top center" }}>
        <iframe ref={iframeRef} src={src} className="border-0 bg-card" style={{ width: config.width, height: frameHeight }} title={title} />
      </div>
    </div>
  );
}

/* ── Column header ────────────────────────────────────────────────── */

function ColumnHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <span className="text-xs font-semibold text-foreground">{title}</span>
    </div>
  );
}

/* ── Info panel (left column, read-only) ──────────────────────────── */

type DynamicInfo = {
  type: "post" | "product";
  id: number;
  title: string;
  slug: string;
  path: string;
  description: string | null;
  status: string;
  categoryName: string | null;
  updatedAt: string;
  imageUrl: string | null;
};

function InfoPanel({ info }: { info: DynamicInfo }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {info.type === "post" ? "Post" : "Produto"}
        </p>
        <h2 className="text-base font-semibold text-foreground">{info.title}</h2>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {info.path}
      </div>

      {info.categoryName && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Categoria:</span> {info.categoryName}
        </div>
      )}

      {info.description && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Descrição:</span>
          <p className="mt-1 line-clamp-4">{info.description}</p>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Status:</span>{" "}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          info.status === "published"
            ? "bg-success-bg text-success ring-1 ring-success/20"
            : "bg-warning-bg text-warning ring-1 ring-warning/20"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${info.status === "published" ? "bg-success" : "bg-warning"}`} />
          {info.status === "published" ? "Publicado" : "Rascunho"}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Atualizado:</span>{" "}
        {new Date(info.updatedAt).toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
      </div>

      <p className="rounded-md border border-border bg-accent/50 px-3 py-2 text-[11px] text-muted-foreground">
        Esta pagina e gerada dinamicamente a partir dos dados do {info.type === "post" ? "post" : "produto"}.
        Para editar, use a secao de {info.type === "post" ? "Posts" : "Produtos"} no menu.
      </p>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

export default function DynamicPageEditor() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") as "post" | "product" | null;
  const id = searchParams.get("id");

  const [info, setInfo] = useState<DynamicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<DeviceKey>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!type || !id) return;
    const endpoint = type === "post" ? `/api/admin/posts/${id}` : `/api/admin/products/${id}`;
    fetch(endpoint)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setInfo({
          type,
          id: data.id,
          title: data.title ?? data.name ?? "",
          slug: data.slug,
          path: type === "post" ? `/posts/${data.slug}` : `/${data.slug}/p`,
          description: data.excerpt ?? data.description ?? null,
          status: data.status ?? "published",
          categoryName: data.categoryName ?? data.category?.name ?? null,
          updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
          imageUrl: data.coverUrl ?? data.imageUrl ?? null,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) {
    return (
      <AdminShell title="Carregando...">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  if (!info) {
    return (
      <AdminShell title="Pagina não encontrada">
        <div className="p-6 text-sm text-muted-foreground">Pagina dinamica nao encontrada.</div>
      </AdminShell>
    );
  }

  const previewUrl = type === "post"
    ? `/api/admin/posts/${id}/preview-proxy`
    : `/api/admin/products/${id}/preview-proxy`;

  return (
    <AdminShell title={info.title}>
      <div className="-mx-2 -mt-2 lg:-mx-4 lg:-mt-4 flex gap-1 pr-12 pb-9" style={{ minHeight: "calc(100vh - 5.5rem)" }}>
        {/* ── Info column (left) ───────────────────────────────────── */}
        <div className="flex flex-col border border-border bg-card rounded-t-lg" style={{ width: "33.333%" }}>
          <ColumnHeader title={info.type === "post" ? "Post" : "Produto"} />
          <InfoPanel info={info} />
        </div>

        {/* ── Preview column (right) ───────────────────────────────── */}
        <div className="flex flex-col border border-border bg-card rounded-t-lg overflow-hidden" style={{ width: "66.666%" }}>
          <ColumnHeader title="Preview" />
          <div className="flex-1 relative bg-accent flex flex-col min-h-0">
            <div className="flex items-center gap-1.5 border-b border-border bg-background px-3 py-1.5">
              {/* Device switcher */}
              <div className="flex gap-0.5 rounded-md bg-accent p-0.5">
                {(["desktop", "tablet", "mobile"] as DeviceKey[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPreviewDevice(d)}
                    className={`rounded p-1 transition-colors ${previewDevice === d ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-muted-foreground"}`}
                    title={d.charAt(0).toUpperCase() + d.slice(1)}
                  >
                    {d === "desktop" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    )}
                    {d === "tablet" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
                      </svg>
                    )}
                    {d === "mobile" && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <span className="flex-1 rounded bg-card px-2 py-0.5 text-[11px] text-muted-foreground font-mono border border-border truncate">
                {info.path}
              </span>
              <button
                type="button"
                onClick={() => { if (iframeRef.current) iframeRef.current.src = previewUrl; }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Recarregar"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => window.open(previewUrl, "_blank")}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Abrir em nova aba"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            </div>
            <PreviewFrame iframeRef={iframeRef} src={previewUrl} device={previewDevice} title={`Preview: ${info.title}`} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
