"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { AdminShell, FormField, ImageUpload, PageBuilder, useTenant } from "@brasa/admin";
import manifest from "@/manifest.json";
import type { BrasaManifest, SectionBlock } from "@brasa/core/manifest";

type EditState = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  content: string;
};

type Page = {
  id: number;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  content: string;
  draft: EditState | null;
  sections: SectionBlock[] | null;
  draftSections: SectionBlock[] | null;
  createdAt: string;
  updatedAt: string;
};

type ColumnKey = "sections" | "preview" | "seo" | "changes";

function slugToPath(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <svg
      className={`${small ? "h-3.5 w-3.5" : "h-8 w-8"} animate-spin text-primary`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Toolbar icons ──────────────────────────────────────────────────── */

function IconProperties() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84.84-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}

function IconSeo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  );
}

function IconPreview() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconChanges() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v14" />
      <path d="m5 10 7 7 7-7" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

function IconSections() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="12" width="18" height="3" rx="1" />
      <rect x="3" y="18" width="18" height="3" rx="1" />
    </svg>
  );
}

const COLUMNS: { key: ColumnKey; label: string; icon: React.ReactNode }[] = [
  { key: "sections", label: "Sections", icon: <IconSections /> },
  { key: "preview", label: "Preview", icon: <IconPreview /> },
  { key: "seo", label: "Page SEO", icon: <IconSeo /> },
  { key: "changes", label: "Alteracoes", icon: <IconChanges /> },
];

/* ── Content tabs ───────────────────────────────────────────────────── */

function ContentTabs({
  active,
  onSwitch,
}: {
  active: "code" | "preview";
  onSwitch: (tab: "code" | "preview") => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-accent p-0.5">
      <button
        type="button"
        onClick={() => onSwitch("code")}
        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
          active === "code" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Codigo
      </button>
      <button
        type="button"
        onClick={() => onSwitch("preview")}
        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
          active === "preview" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Preview
      </button>
    </div>
  );
}

/* ── Preview Frame (responsive simulation) ─────────────────────────── */

const DEVICE_CONFIGS = {
  desktop: { width: 1440, height: 900, frame: false },
  tablet: { width: 768, height: 1024, frame: true },
  mobile: { width: 375, height: 812, frame: true },
} as const;

function PreviewFrame({
  iframeRef,
  src,
  device,
  title,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  src: string;
  device: "desktop" | "tablet" | "mobile";
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const config = DEVICE_CONFIGS[device];

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    function calc() {
      const availableWidth = container.clientWidth;
      const s = Math.min(availableWidth / config.width, 1);
      setScale(s);
    }

    calc();
    const observer = new ResizeObserver(calc);
    observer.observe(container);
    return () => observer.disconnect();
  }, [device, config.width, config.frame]);

  if (!config.frame) {
    // Desktop: iframe at real width, scaled to fit column, full height
    const iframeHeight = scale > 0 ? `${100 / scale}%` : "100%";
    return (
      <div ref={containerRef} className="flex-1 bg-accent overflow-hidden">
        <div
          style={{
            width: config.width,
            height: "100%",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            ref={iframeRef}
            src={src}
            className="border-0 bg-card"
            style={{ width: config.width, height: iframeHeight }}
            title={title}
          />
        </div>
      </div>
    );
  }

  // Tablet / Mobile: same scaling approach, no device mockup
  const frameHeight = scale > 0 ? `${100 / scale}%` : "100%";
  return (
    <div ref={containerRef} className="flex-1 bg-accent overflow-hidden flex justify-center">
      <div
        style={{
          width: config.width,
          height: "100%",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <iframe
          ref={iframeRef}
          src={src}
          className="border-0 bg-card"
          style={{ width: config.width, height: frameHeight }}
          title={title}
        />
      </div>
    </div>
  );
}

/* ── Column header ──────────────────────────────────────────────────── */

function ColumnHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
        aria-label={`Fechar ${title}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function colWidth(count: number) {
  if (count <= 1) return "100%";
  if (count === 2) return "50%";
  if (count === 3) return "33.333%";
  return "25%";
}

const FIELD_LABELS: Record<string, string> = {
  title: "Titulo",
  metaTitle: "Meta Title",
  metaDescription: "Meta Description",
  ogTitle: "OG Title",
  ogDescription: "OG Description",
  ogImageUrl: "OG Image URL",
  content: "Conteudo",
};

const DIFF_FIELDS: (keyof EditState)[] = [
  "title", "metaTitle", "metaDescription",
  "ogTitle", "ogDescription", "ogImageUrl", "content",
];

function getChanges(page: Page): { field: string; label: string; published: string; draft: string }[] {
  if (!page.draft) return [];
  const result: { field: string; label: string; published: string; draft: string }[] = [];
  for (const key of DIFF_FIELDS) {
    const pub = (page[key] ?? "") as string;
    const dra = (page.draft[key] ?? "") as string;
    if (pub !== dra) {
      result.push({
        field: key,
        label: FIELD_LABELS[key] || key,
        published: pub,
        draft: dra,
      });
    }
  }
  return result;
}

function truncate(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

/* ── Main ───────────────────────────────────────────────────────────── */

export default function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const tenant = useTenant();

  const [page, setPage] = useState<Page | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [openColumns, setOpenColumns] = useState<Set<ColumnKey>>(new Set(["sections", "preview"]));
  const [contentTab, setContentTab] = useState<"code" | "preview">("code");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [sectionBlocks, setSectionBlocks] = useState<SectionBlock[]>([]);
  const [savingSections, setSavingSections] = useState(false);
  const [inlineEdit, setInlineEdit] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sectionsDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveSectionsRef = useRef<((blocks: SectionBlock[]) => Promise<void>) | null>(null);

  // ── Inline editor: inject script and toggle ──────────────────────
  function sendToIframe(msg: object) {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function injectEditorScript() {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    if (iframe.contentDocument.querySelector("script[data-brasa-editor]")) return;
    const script = iframe.contentDocument.createElement("script");
    script.setAttribute("data-brasa-editor", "true");
    script.src = "/brasa-editor.js";
    iframe.contentDocument.head.appendChild(script);
  }

  function toggleInlineEdit() {
    setInlineEdit((prev) => {
      const next = !prev;
      if (next) {
        injectEditorScript();
        // Give the script a tick to load, then send enable
        setTimeout(() => {
          sendToIframe({ type: "brasa:init", blocks: sectionBlocks });
          sendToIframe({ type: "brasa:enable" });
        }, 150);
      } else {
        sendToIframe({ type: "brasa:disable" });
      }
      return next;
    });
  }

  // Re-send enable when iframe reloads while inline edit is active
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    function onLoad() {
      if (!inlineEdit) return;
      injectEditorScript();
      setTimeout(() => {
        sendToIframe({ type: "brasa:init", blocks: sectionBlocks });
        sendToIframe({ type: "brasa:enable" });
      }, 150);
    }
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineEdit, sectionBlocks]);

  // Listen for messages from the iframe
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg.type !== "string") return;

      switch (msg.type) {
        case "brasa:update": {
          const { blockId, propKey, value } = msg as {
            blockId: string;
            propKey: string;
            value: string;
          };
          setSectionBlocks((prev) => {
            const next = prev.map((block) => {
              if (block.id !== blockId) return block;
              return { ...block, props: { ...block.props, [propKey]: value } };
            });
            // Debounced save — use ref to avoid stale closure
            if (sectionsDebounceRef.current) clearTimeout(sectionsDebounceRef.current);
            sectionsDebounceRef.current = setTimeout(() => saveSectionsRef.current?.(next), 1000);
            return next;
          });
          break;
        }

        case "brasa:select": {
          const { blockId } = msg as { blockId: string };
          // Ensure sections panel is open and the block is visible
          setOpenColumns((prev) => {
            const next = new Set(prev);
            next.add("sections");
            return next;
          });
          // Scroll to the block in the sidebar — best-effort via data attribute
          setTimeout(() => {
            const el = document.querySelector(`[data-section-id="${blockId}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 50);
          break;
        }

        case "brasa:media-request": {
          // For now, open the sections panel — MediaLibrary integration can be added later
          toast("Selecione uma imagem no painel de secoes");
          setOpenColumns((prev) => {
            const next = new Set(prev);
            next.add("sections");
            return next;
          });
          break;
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleColumn(key: ColumnKey) {
    setOpenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  useEffect(() => {
    fetch(`/api/admin/pages/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar pagina");
        return res.json();
      })
      .then((data: Page) => {
        setPage(data);
        const initial: EditState = data.draft ?? {
          title: data.title,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImageUrl: data.ogImageUrl,
          content: data.content,
        };
        setEditState(initial);
        setSavedSnapshot(JSON.stringify(initial));
        setOgImagePreview(initial.ogImageUrl || null);
        // Use draftSections only if it differs from published sections
        const pub = JSON.stringify(data.sections ?? []);
        const draft = JSON.stringify(data.draftSections ?? []);
        const effectiveSections = (draft !== pub && data.draftSections)
          ? data.draftSections
          : (data.sections ?? []);
        setSectionBlocks(effectiveSections as SectionBlock[]);
      })
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const save = useCallback(async (state: EditState) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      const updated: Page = await res.json();
      setPage(updated);
      setSavedSnapshot(JSON.stringify(state));
      setLastSaved(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }, [id]);

  const saveSections = useCallback(async (blocks: SectionBlock[]) => {
    setSavingSections(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftSections: blocks }),
      });
      if (res.ok) {
        const updated: Page = await res.json();
        setPage(updated);
      }
      setLastSaved(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      // Reload preview iframe
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch {
      toast.error("Erro ao salvar sections");
    } finally {
      setSavingSections(false);
    }
  }, [id]);

  // Keep ref in sync so the message listener always calls the latest version
  saveSectionsRef.current = saveSections;

  function handleSectionsChange(blocks: SectionBlock[]) {
    setSectionBlocks(blocks);
    if (sectionsDebounceRef.current) clearTimeout(sectionsDebounceRef.current);
    sectionsDebounceRef.current = setTimeout(() => saveSections(blocks), 1500);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setEditState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [name]: value };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 1500);
      return next;
    });
  }

  async function handlePublish() {
    if (!editState || !page) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await save(editState);
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("Erro ao publicar");
      const updated: Page = await res.json();
      setPage(updated);
      setSavedSnapshot(JSON.stringify(editState));
      toast.success("Pagina publicada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Editar pagina" headerExtra={null}>
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  if (fetchError || !page || !editState) {
    return (
      <AdminShell title="Editar pagina" headerExtra={null}>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-danger-bg p-6 text-sm text-destructive">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
          </svg>
          {fetchError ?? "Pagina nao encontrada"}
        </div>
      </AdminShell>
    );
  }

  const hasSectionsDraft = page.draftSections !== null &&
    JSON.stringify(page.draftSections) !== JSON.stringify(page.sections);
  const hasDraft = page.draft !== null || hasSectionsDraft;
  const hasContent = !!(editState?.content || page.content);
  const hasSections = sectionBlocks.length > 0 || (page.sections as SectionBlock[] | null)?.length;
  const frontendBase = tenant?.frontendUrl || "";
  const previewUrl = hasSections
    ? `${frontendBase}${slugToPath(page.slug)}${slugToPath(page.slug) === "/" ? "" : "/"}?draft=true`
    : hasContent
      ? `/api/admin/pages/${id}/preview`
      : `${frontendBase}${slugToPath(page.slug)}`;
  const isBusy = saving || publishing;

  // Draft count: number of fields changed vs published
  const contentDraftCount = page.draft ? countChanges(page) : 0;
  const sectionChanges = getSectionChanges(page, sectionBlocks);
  const draftCount = contentDraftCount + sectionChanges.length;

  // Header extra
  const publishButton = (
    <div className="flex items-center gap-2">
      {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Spinner small /></span>}
      {/* Staging indicator — links to /admin/publicar */}
      <a
        href="/admin/publicar"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow transition-colors hover:bg-background"
      >
        <span>staging</span>
        {hasDraft && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white leading-none">
            {draftCount}
          </span>
        )}
      </a>

      {/* Publish button */}
      <button
        type="button"
        onClick={handlePublish}
        disabled={isBusy || !hasDraft}
        className="rounded-md border border-primary bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {publishing ? "Publicando..." : "Publicar"}
      </button>
    </div>
  );

  return (
    <AdminShell title={`${page.title}`} headerExtra={publishButton}>
      <div className="-mx-2 -mt-2 lg:-mx-4 lg:-mt-4 flex gap-1 pr-12" style={{ minHeight: "calc(100vh - 5.5rem)" }}>
        {/* ── Sections column (includes page properties) ─────────── */}
        {openColumns.has("sections") && (
          <div className="flex flex-col border border-border bg-card rounded-t-lg" style={{ width: colWidth(openColumns.size) }}>
            <ColumnHeader title={`Sections${savingSections ? " (salvando...)" : ""}`} onClose={() => toggleColumn("sections")} />
            <div className="flex-1 overflow-y-auto">
              {/* Page properties */}
              <div className="border-b border-border p-4 space-y-3">
                <FormField label="Titulo" name="title" value={editState.title} onChange={handleChange} required />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {slugToPath(page.slug)}
                </div>
              </div>
              {/* Section builder */}
              <PageBuilder
                manifest={manifest as unknown as BrasaManifest}
                value={sectionBlocks}
                onChange={handleSectionsChange}
              />
            </div>
          </div>
        )}

        {/* ── Preview column ─────────────────────────────────────── */}
        {openColumns.has("preview") && (
          <div className="flex flex-col border border-border bg-card rounded-t-lg overflow-hidden" style={{ width: colWidth(openColumns.size) }}>
            <ColumnHeader title="Preview" onClose={() => toggleColumn("preview")} />
            <div className="flex-1 relative bg-accent flex flex-col min-h-0">
              <div className="flex items-center gap-1.5 border-b border-border bg-background px-3 py-1.5">
                {/* Device switcher */}
                <div className="flex gap-0.5 rounded-md bg-accent p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`rounded p-1 transition-colors ${previewDevice === "desktop" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-muted-foreground"}`}
                    title="Desktop"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={`rounded p-1 transition-colors ${previewDevice === "tablet" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-muted-foreground"}`}
                    title="Tablet"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`rounded p-1 transition-colors ${previewDevice === "mobile" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-muted-foreground"}`}
                    title="Mobile"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Inline edit toggle */}
                <button
                  type="button"
                  onClick={toggleInlineEdit}
                  title={inlineEdit ? "Desativar edicao inline" : "Edicao inline"}
                  aria-pressed={inlineEdit}
                  className={`rounded p-1 transition-colors ${
                    inlineEdit
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-muted-foreground"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
                    <path d="m15 5 4 4" />
                  </svg>
                </button>

                <span className="flex-1 rounded bg-card px-2 py-0.5 text-[11px] text-muted-foreground font-mono border border-border truncate">
                  {frontendBase || "configure frontend_url"}{slugToPath(page.slug)}
                </span>
                <button
                  type="button"
                  onClick={() => { if (iframeRef.current) iframeRef.current.src = previewUrl; }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-muted-foreground transition-colors"
                  title="Recarregar"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                  </svg>
                </button>
              </div>
              <PreviewFrame
                iframeRef={iframeRef}
                src={previewUrl}
                device={previewDevice}
                title={`Preview: ${page.title}`}
              />
            </div>
          </div>
        )}

        {/* ── SEO column ─────────────────────────────────────────── */}
        {openColumns.has("seo") && (
          <div className="flex flex-col border border-border bg-card rounded-t-lg" style={{ width: colWidth(openColumns.size) }}>
            <ColumnHeader title="Page SEO" onClose={() => toggleColumn("seo")} />
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                {/* Google preview */}
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Google</p>
                  <p className="text-sm font-medium text-[#1a0dab] leading-tight truncate">
                    {editState.metaTitle || editState.title || "Titulo"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-success font-mono truncate">
                    {typeof window !== "undefined" ? window.location.origin : ""}{slugToPath(page.slug)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {editState.metaDescription || "Sem descricao"}
                  </p>
                </div>

                <FormField label="Meta Title" name="metaTitle" value={editState.metaTitle ?? ""} onChange={handleChange} placeholder="Titulo no Google" description={`${(editState.metaTitle ?? "").length}/60`} />
                <FormField label="Meta Description" name="metaDescription" type="textarea" value={editState.metaDescription ?? ""} onChange={handleChange} placeholder="Descricao no Google" description={`${(editState.metaDescription ?? "").length}/160`} />

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open Graph</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <FormField label="OG Title" name="ogTitle" value={editState.ogTitle ?? ""} onChange={handleChange} placeholder="Titulo redes sociais" />
                <FormField label="OG Description" name="ogDescription" type="textarea" value={editState.ogDescription ?? ""} onChange={handleChange} placeholder="Descricao redes sociais" />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">OG Image</label>
                  <ImageUpload
                    value={null}
                    previewUrl={ogImagePreview}
                    onChange={(_id, url) => {
                      setEditState((prev) => {
                        if (!prev) return prev;
                        const next = { ...prev, ogImageUrl: url || "" };
                        if (debounceRef.current) clearTimeout(debounceRef.current);
                        debounceRef.current = setTimeout(() => save(next), 1500);
                        return next;
                      });
                      setOgImagePreview(url);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Changes column ────────────────────────────────────── */}
        {openColumns.has("changes") && (
          <div className="flex flex-col border border-border bg-card rounded-t-lg" style={{ width: colWidth(openColumns.size) }}>
            <ColumnHeader title={`Alteracoes${draftCount > 0 ? ` (${draftCount})` : ""}`} onClose={() => toggleColumn("changes")} />
            <div className="flex-1 overflow-y-auto p-5">
              {!hasDraft ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">Nenhuma alteracao pendente</p>
                  <p className="mt-1 text-xs text-muted-foreground">Todas as alteracoes foram publicadas.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {draftCount} campo{draftCount !== 1 ? "s" : ""} alterado{draftCount !== 1 ? "s" : ""} desde a ultima publicacao.
                  </p>

                  {getChanges(page).map((change) => (
                    <div key={change.field} className="rounded-lg border border-border overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden="true">
                          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84.84-2.872a2 2 0 0 1 .506-.854z" />
                        </svg>
                        <span className="text-xs font-semibold text-foreground">{change.label}</span>
                      </div>
                      <div className="divide-y divide-border">
                        {/* Published (old) */}
                        <div className="px-3 py-2">
                          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Publicado
                          </span>
                          {change.field === "content" ? (
                            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-danger-bg p-2 font-mono text-[11px] leading-relaxed text-destructive max-h-40 overflow-y-auto">
                              {change.published ? truncate(change.published, 500) : <span className="italic text-muted-foreground">(vazio)</span>}
                            </pre>
                          ) : (
                            <p className="mt-1 rounded bg-danger-bg px-2 py-1.5 text-xs text-destructive break-words">
                              {change.published || <span className="italic text-muted-foreground">(vazio)</span>}
                            </p>
                          )}
                        </div>
                        {/* Draft (new) */}
                        <div className="px-3 py-2">
                          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Rascunho
                          </span>
                          {change.field === "content" ? (
                            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-success-bg p-2 font-mono text-[11px] leading-relaxed text-success max-h-40 overflow-y-auto">
                              {change.draft ? truncate(change.draft, 500) : <span className="italic text-muted-foreground">(vazio)</span>}
                            </pre>
                          ) : (
                            <p className="mt-1 rounded bg-success-bg px-2 py-1.5 text-xs text-success break-words">
                              {change.draft || <span className="italic text-muted-foreground">(vazio)</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Section changes */}
                  {sectionChanges.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</p>
                      <div className="space-y-2">
                        {sectionChanges.map((sc, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              sc.type === "added"
                                ? "bg-success-bg text-success"
                                : sc.type === "removed"
                                  ? "bg-danger-bg text-destructive"
                                  : "bg-warning-bg text-warning"
                            }`}>
                              {sc.type === "added" ? "nova" : sc.type === "removed" ? "removida" : "editada"}
                            </span>
                            <span className="text-xs font-medium text-foreground">{sc.component}</span>
                            {sc.details && (
                              <span className="text-[10px] text-muted-foreground">{sc.details}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Publish from changes panel */}
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={isBusy}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {publishing ? "Publicando..." : `Publicar ${draftCount} alterac${draftCount !== 1 ? "oes" : "ao"}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state when all closed */}
        {openColumns.size === 0 && (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">Nenhum painel aberto</p>
              <p className="mt-1 text-xs">Use a barra lateral para abrir paineis</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right toolbar (fixed to viewport right edge) ─────────── */}
      <div className="fixed right-0 top-14 bottom-0 z-20 flex w-12 flex-col items-center justify-center gap-1 border-l border-border bg-card">
        {COLUMNS.map((col) => {
          const isActive = openColumns.has(col.key);
          const showBadge = col.key === "changes" && draftCount > 0;
          return (
            <div key={col.key} className="group relative">
              <button
                type="button"
                onClick={() => toggleColumn(col.key)}
                className={[
                  "relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150",
                  isActive
                    ? "bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-muted-foreground",
                ].join(" ")}
                aria-label={col.label}
                aria-pressed={isActive}
              >
                {col.icon}
                {showBadge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-white leading-none">
                    {draftCount}
                  </span>
                )}
              </button>
              <div className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {col.label}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

function countChanges(page: Page): number {
  if (!page.draft) return 0;
  const draft = page.draft;
  const keys: (keyof EditState)[] = ["title", "metaTitle", "metaDescription", "ogTitle", "ogDescription", "ogImageUrl", "content"];
  return keys.filter((k) => (draft[k] ?? "") !== (page[k] ?? "")).length;
}

type SectionChange = {
  type: "added" | "removed" | "modified";
  component: string;
  id: string;
  details?: string;
};

function getSectionChanges(page: Page, draftBlocks: SectionBlock[]): SectionChange[] {
  const published = (page.sections ?? []) as SectionBlock[];
  const changes: SectionChange[] = [];

  const pubMap = new Map(published.map((b) => [b.id, b]));
  const draftMap = new Map(draftBlocks.map((b) => [b.id, b]));

  // Added
  for (const block of draftBlocks) {
    if (!pubMap.has(block.id)) {
      changes.push({ type: "added", component: block.component, id: block.id });
    }
  }

  // Removed
  for (const block of published) {
    if (!draftMap.has(block.id)) {
      changes.push({ type: "removed", component: block.component, id: block.id });
    }
  }

  // Modified
  for (const block of draftBlocks) {
    const pub = pubMap.get(block.id);
    if (pub) {
      const pubProps = JSON.stringify(pub.props);
      const draftProps = JSON.stringify(block.props);
      if (pubProps !== draftProps || pub.component !== block.component) {
        const changedKeys = Object.keys(block.props).filter(
          (k) => JSON.stringify(block.props[k]) !== JSON.stringify(pub.props[k])
        );
        changes.push({
          type: "modified",
          component: block.component,
          id: block.id,
          details: changedKeys.length > 0 ? changedKeys.join(", ") : undefined,
        });
      }
    }
  }

  // Order changes (check if position changed)
  if (changes.length === 0 && published.length === draftBlocks.length) {
    for (let i = 0; i < published.length; i++) {
      if (published[i].id !== draftBlocks[i]?.id) {
        changes.push({ type: "modified", component: "Ordem", id: "reorder", details: "Sections reordenadas" });
        break;
      }
    }
  }

  return changes;
}
