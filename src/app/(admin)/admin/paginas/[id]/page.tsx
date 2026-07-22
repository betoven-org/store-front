"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminShell, FormField, ImageUpload, PageBuilder, SectionEditor, BrasaPageLoader, BrasaLoader, SeoPreview, ABTestingPanel } from "@brasa/admin";
import type { BrasaManifest, SectionBlock, SectionSchema } from "@brasa/core/manifest";

import {
  usePageData,
  useSectionState,
  useIframeEditor,
  useAutosave,
  useShortcuts,
  usePageVersions,
} from "./_hooks";
import type { EditState } from "./_hooks";
import { slugToPath, countChanges, getSectionChanges } from "./_hooks/helpers";
import { PreviewToolbar, SchedulerPopover } from "./_components";

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
    if (iframeRef.current && src) {
      iframeRef.current.src = src;
    }
  }, [src, iframeRef]);

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
    const iframeHeight = scale > 0 ? `${100 / scale}vh` : "100vh";
    return (
      <div ref={containerRef} className="flex-1 bg-accent overflow-hidden">
        <div
          style={{
            width: config.width,
            height: "100vh",
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

  const frameHeight = scale > 0 ? `${100 / scale}vh` : "100vh";
  return (
    <div ref={containerRef} className="flex-1 bg-accent overflow-hidden flex justify-center">
      <div
        style={{
          width: config.width,
          height: "100vh",
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

/* ── Main ───────────────────────────────────────────────────────────── */

export default function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // -- Tenant + Manifest
  const [tenant, setTenantLocal] = useState<{ frontendUrl: string | null; previewUrl?: string | null; revalidateSecret: string | null } | null>(null);
  const [manifest, setManifest] = useState<BrasaManifest | null>(null);
  useEffect(() => {
    fetch("/api/admin/tenant-info")
      .then((r) => (r.ok ? r.json() : null))
      .then(setTenantLocal)
      .catch(() => {});
    fetch("/api/admin/manifest")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setManifest(data as BrasaManifest))
      .catch(() => {});
  }, []);

  // -- Page data hook
  const pageData = usePageData(id);
  const {
    page, setPage, editState, setEditState,
    savedSnapshot, setSavedSnapshot,
    save, publish, schedule, cancelSchedule,
    saving, publishing, scheduling,
    loading, fetchError,
    lastSaved, setLastSaved,
    previewKey, setPreviewKey,
    scheduledAt, setScheduledAt,
    hasDraft, debounceRef, initialSections, clearInitialSections,
  } = pageData;

  // -- Section state hook
  const sectionCallbacks = useMemo(
    () => ({
      setPage: (updater: (prev: unknown) => unknown) => setPage(updater(page) as typeof page),
      setLastSaved: (val: string) => setLastSaved(val),
      setPreviewKey: (updater: (prev: number) => number) => setPreviewKey(updater),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page],
  );

  const sectionState = useSectionState(id, sectionCallbacks);
  const {
    sectionBlocks, setSectionBlocks,
    handleSectionsChange: rawHandleSectionsChange,
    saveSections, undo, redo, savingSections,
    pushToHistory, sectionsDebounceRef, saveSectionsRef,
  } = sectionState;

  // Seed sections from initial page load
  useEffect(() => {
    if (initialSections) {
      setSectionBlocks(initialSections);
      pushToHistory(initialSections);
      clearInitialSections();
    }
  }, [initialSections, setSectionBlocks, pushToHistory, clearInitialSections]);

  // -- Iframe editor hook
  const [openColumns, setOpenColumns] = useState<Set<string>>(new Set(["sections", "preview"]));

  const iframeEditor = useIframeEditor({
    iframeRef,
    sectionBlocks,
    onSectionUpdate: setSectionBlocks,
    sectionsDebounceRef,
    saveSectionsRef,
    setOpenColumns,
  });
  const { inlineEdit, toggleInlineEdit, sendToIframe } = iframeEditor;

  // Wrap handleSectionsChange to also send to iframe
  const handleSectionsChange = useCallback(
    (blocks: SectionBlock[]) => {
      rawHandleSectionsChange(blocks);
      sendToIframe({ type: "brasa:sections-update", blocks });
    },
    [rawHandleSectionsChange, sendToIframe],
  );

  // -- Autosave hook
  useAutosave(editState, savedSnapshot, save, 30000);

  // -- Shortcuts hook
  const hasDraftRef = useRef(false);
  hasDraftRef.current = hasDraft;

  useShortcuts({
    onSave: useCallback(() => {
      if (editState) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        save(editState).then(() => toast("Salvo"));
      }
    }, [editState, save, debounceRef]),
    onPublish: useCallback(() => {
      if (hasDraftRef.current) {
        publish();
      } else {
        toast("Nenhuma alteracao para publicar");
      }
    }, [publish]),
    onUndo: undo,
    onRedo: redo,
  });

  // -- Versions hook
  const versionCallbacks = useMemo(
    () => ({
      setPage: (p: typeof page) => setPage(p),
      setEditState: (s: EditState) => setEditState(s),
      setSavedSnapshot: (s: string) => setSavedSnapshot(s),
      setSectionBlocks: (b: SectionBlock[]) => setSectionBlocks(b),
      pushToHistory: (b: SectionBlock[]) => pushToHistory(b),
      setPreviewKey: (u: (p: number) => number) => setPreviewKey(u),
    }),
    [setPage, setEditState, setSavedSnapshot, setSectionBlocks, pushToHistory, setPreviewKey],
  );
  const { versions, loadingVersions, rollingBack, fetchVersions, rollback } =
    usePageVersions(id, versionCallbacks);

  // Fetch versions when history tab opens
  const [activeTab, setActiveTab] = useState<"sections" | "seo" | "history">("sections");
  useEffect(() => {
    if (activeTab === "history") fetchVersions();
  }, [activeTab, fetchVersions]);

  // -- UI state
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showScheduler, setShowScheduler] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ block: SectionBlock; schema: SectionSchema } | null>(null);

  // Sync ogImagePreview from editState on initial load
  useEffect(() => {
    if (editState) setOgImagePreview(editState.ogImageUrl || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editState === null]);

  // -- Memoized diff calculations (avoids JSON.stringify on every render)
  const contentDraftCount = useMemo(
    () => (page ? countChanges(page) : 0),
    [page],
  );
  const sectionChanges = useMemo(
    () => (page ? getSectionChanges(page, sectionBlocks) : []),
    [page, sectionBlocks],
  );
  const draftCount = contentDraftCount + sectionChanges.length;

  // -- Handlers
  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao duplicar pagina");
      }
      const created = await res.json();
      toast.success(`Pagina duplicada: "${created.title}"`);
      router.push(`/admin/paginas/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar pagina");
    } finally {
      setDuplicating(false);
    }
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

  // -- Loading / Error states
  if (loading) {
    return (
      <AdminShell title="Editar pagina" headerExtra={null}>
        <BrasaPageLoader />
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

  // -- Derived values
  const hasSections = sectionBlocks.length > 0 || (page.sections as SectionBlock[] | null)?.length;
  const frontendBase = tenant?.previewUrl || tenant?.frontendUrl || "";
  const pagePath = slugToPath(page.slug);
  const hasContent = !!(page.content || page.draft);
  const isScheduled = !!page.scheduledAt;
  const isBusy = saving || publishing;

  const previewBase = frontendBase && (hasContent || hasSections)
    ? `${frontendBase}/preview${pagePath === "/" ? "/home" : pagePath}`
    : (hasContent || hasSections)
      ? `/api/admin/pages/${id}/preview?sections=draft`
      : "";
  const frontendPreviewUrl = frontendBase ? `${frontendBase}${pagePath}` : "";
  const previewUrl = previewBase
    ? `${previewBase}${previewBase.includes("?") ? "&" : "?"}_t=${previewKey}`
    : "";

  // -- Header extra (publish button area)
  const publishButton = (
    <div className="flex items-center gap-2">
      {saving && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><BrasaLoader size="sm" /></span>}
      {/* Duplicate */}
      <button type="button" onClick={handleDuplicate} disabled={duplicating}
        className="rounded-md border border-border bg-card p-1.5 text-muted-foreground shadow transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        title="Duplicar pagina">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      {/* Changes indicator */}
      {hasDraft && (
        <button type="button"
          onClick={() => setOpenColumns((prev) => {
            const next = new Set(prev);
            if (next.has("changes")) { next.delete("changes"); } else {
              if (next.size >= 2) { const first = next.values().next().value; if (first) next.delete(first); }
              next.add("changes");
            }
            return next;
          })}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow transition-colors ${
            openColumns.has("changes")
              ? "border-primary bg-primary/5 text-primary"
              : "border-warning bg-warning-bg text-warning hover:bg-warning/10"
          }`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {draftCount} alterac{draftCount !== 1 ? "oes" : "ao"}
        </button>
      )}
      {/* Scheduled indicator */}
      {isScheduled && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-medium">
            {new Date(page.scheduledAt!).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <button type="button" onClick={cancelSchedule} disabled={scheduling}
            className="ml-1 rounded p-0.5 text-primary/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cancelar agendamento">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Schedule button */}
      <div className="relative">
        <button type="button"
          onClick={() => {
            setShowScheduler((p) => !p);
            if (!scheduledAt && !page.scheduledAt) {
              const d = new Date();
              d.setHours(d.getHours() + 1);
              d.setMinutes(0, 0, 0);
              setScheduledAt(d.toISOString());
            }
          }}
          disabled={isBusy || !hasDraft}
          className="rounded-md border border-border bg-card p-1.5 text-muted-foreground shadow transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          title="Agendar publicação">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
        {showScheduler && (
          <SchedulerPopover
            scheduledAt={scheduledAt}
            onScheduledAtChange={setScheduledAt}
            onSchedule={() => { schedule(); setShowScheduler(false); }}
            onCancel={() => setShowScheduler(false)}
            onCancelSchedule={cancelSchedule}
            scheduling={scheduling}
            isScheduled={isScheduled}
          />
        )}
      </div>
      {/* Publish button */}
      <button type="button" onClick={publish} disabled={isBusy || !hasDraft}
        className="rounded-md border border-primary bg-card px-4 py-1.5 text-xs font-semibold text-primary shadow transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40">
        {publishing ? "Publicando..." : isScheduled ? "Publicar agora" : "Publicar"}
      </button>
    </div>
  );

  return (
    <AdminShell title={`${page.title}`} headerExtra={publishButton}>
      <div className="-mx-2 -mt-2 lg:-mx-4 lg:-mt-4 flex h-[calc(100vh-3.5rem)]">
        {/* Left panel: Sections + Props (fixed 360px) */}
        <div className="flex flex-col w-[360px] min-w-[360px] border-r border-border bg-card overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {(["sections", "seo", "history"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab === "sections" ? `Sections${savingSections ? " ●" : ""}` : tab === "seo" ? "SEO" : "Histórico"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "sections" && (
              <>
                <div className="border-b border-border p-4 space-y-3">
                  <FormField label="Título" name="title" value={editState.title} onChange={handleChange} required />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    {slugToPath(page.slug)}
                  </div>
                </div>
                {manifest ? (
                  <PageBuilder
                    manifest={manifest}
                    value={sectionBlocks}
                    onChange={handleSectionsChange}
                    externalEditor
                    onSelectionChange={setSelectedSection}
                  />
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">Carregando sections...</div>
                )}
              </>
            )}

            {activeTab === "seo" && (
              <div className="p-5 space-y-5">
                <FormField label="Meta Title" name="metaTitle" value={editState.metaTitle ?? ""} onChange={handleChange} placeholder="Titulo no Google" description={`${(editState.metaTitle ?? "").length}/60`} ai="seo" aiContext={editState.title} />
                <FormField label="Meta Description" name="metaDescription" type="textarea" value={editState.metaDescription ?? ""} onChange={handleChange} placeholder="Descricao no Google" description={`${(editState.metaDescription ?? "").length}/160`} ai="seo" aiContext={editState.title} />
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Open Graph</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <FormField label="OG Title" name="ogTitle" value={editState.ogTitle ?? ""} onChange={handleChange} placeholder="Titulo redes sociais" ai="rewrite" aiContext={editState.title} />
                <FormField label="OG Description" name="ogDescription" type="textarea" value={editState.ogDescription ?? ""} onChange={handleChange} placeholder="Descricao redes sociais" ai="rewrite" aiContext={editState.metaDescription} />
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
                <SeoPreview
                  data={{
                    title: editState.title,
                    metaTitle: editState.metaTitle ?? "",
                    metaDescription: editState.metaDescription ?? "",
                    ogTitle: editState.ogTitle ?? "",
                    ogDescription: editState.ogDescription ?? "",
                    ogImage: ogImagePreview || editState.ogImageUrl || undefined,
                    url: `${frontendBase || "meusite.com"}${slugToPath(page.slug)}`,
                  }}
                />
              </div>
            )}

            {activeTab === "history" && (
              <div className="p-4 space-y-2">
                {loadingVersions ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Carregando...</p>
                ) : versions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Nenhuma versão publicada.</p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-foreground">v{v.version}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(v.publishedAt).toLocaleString("pt-BR")}</p>
                      </div>
                      <button type="button" onClick={() => rollback(v.id)} disabled={rollingBack}
                        className="text-[10px] font-medium text-primary hover:underline disabled:opacity-50">
                        Restaurar
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="border-t border-border px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {lastSaved ? `Salvo ${lastSaved}` : ""}
            </span>
            {hasDraft && (
              <span className="text-[10px] font-medium text-warning">{draftCount} alterações</span>
            )}
          </div>
        </div>

        {/* Center panel: Section editor (when a section is selected) */}
        {activeTab === "sections" && selectedSection && (
          <div className="flex flex-col w-[320px] min-w-[320px] border-r border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">{selectedSection.schema.title}</h2>
                {selectedSection.schema.description && (
                  <p className="text-[11px] text-muted-foreground">{selectedSection.schema.description}</p>
                )}
              </div>
              <button type="button" onClick={() => setSelectedSection(null)}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Fechar editor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              <SectionEditor
                schema={selectedSection.schema.props}
                values={selectedSection.block.props}
                loader={selectedSection.schema.loader ? { fn: selectedSection.schema.loader.fn, title: selectedSection.schema.loader.title } : undefined}
                onChange={(newProps: Record<string, unknown>) => {
                  const updated = sectionBlocks.map((b) =>
                    b.id === selectedSection.block.id ? { ...b, props: newProps } : b
                  );
                  handleSectionsChange(updated);
                  setSelectedSection({
                    ...selectedSection,
                    block: { ...selectedSection.block, props: newProps },
                  });
                }}
              />

              {/* A/B Testing + Conditions */}
              <div className="border-t border-border pt-4">
                <ABTestingPanel
                  block={selectedSection.block}
                  onChange={(partial) => {
                    const updated = sectionBlocks.map((b) =>
                      b.id === selectedSection.block.id ? { ...b, ...partial } : b
                    );
                    handleSectionsChange(updated);
                    setSelectedSection({
                      ...selectedSection,
                      block: { ...selectedSection.block, ...partial },
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right area: Preview (fullwidth) */}
        <div className="flex-1 flex flex-col min-w-0 bg-accent overflow-hidden">
          <PreviewToolbar
            previewDevice={previewDevice}
            onDeviceChange={setPreviewDevice}
            inlineEdit={inlineEdit}
            onToggleInlineEdit={toggleInlineEdit}
            urlLabel={`preview interno${slugToPath(page.slug)}`}
            onReload={() => { if (iframeRef.current) iframeRef.current.src = previewUrl; }}
            onOpenExternal={() => { const url = frontendPreviewUrl || previewUrl; if (url) window.open(url, "_blank"); }}
          />

          <div className="flex-1 relative min-h-0">
            {previewUrl ? (
              <PreviewFrame
                iframeRef={iframeRef}
                src={previewUrl}
                device={previewDevice}
                title={`Preview: ${page.title}`}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center h-full text-center p-8">
                <p className="text-sm text-muted-foreground">Adicione sections para ver o preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
