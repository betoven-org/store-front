"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { diffWords } from "diff";
import { AdminShell } from "@brasa/admin";

type EditState = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  content: string;
};

type PendingPage = {
  id: number;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  content: string | null;
  draft: EditState;
  updatedAt: string;
};

type Change = {
  field: string;
  label: string;
  published: string;
  draft: string;
};

const FIELD_LABELS: Record<string, string> = {
  title: "Titulo",
  metaTitle: "Meta Title",
  metaDescription: "Meta Description",
  ogTitle: "OG Title",
  ogDescription: "OG Description",
  ogImageUrl: "OG Image URL",
  content: "Conteudo",
};

const DIFF_FIELDS = [
  "title", "metaTitle", "metaDescription",
  "ogTitle", "ogDescription", "ogImageUrl", "content",
] as const;

function getChanges(page: PendingPage): Change[] {
  if (!page.draft) return [];
  const result: Change[] = [];
  for (const key of DIFF_FIELDS) {
    const pub = ((page as Record<string, unknown>)[key] ?? "") as string;
    const dra = ((page.draft as Record<string, unknown>)[key] ?? "") as string;
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

function InlineDiff({ oldStr, newStr, isContent }: { oldStr: string; newStr: string; isContent?: boolean }) {
  const parts = diffWords(oldStr, newStr);
  const Tag = isContent ? "pre" : "p";
  return (
    <Tag className={`mt-1 rounded border border-border bg-background px-3 py-2 text-xs leading-relaxed break-words ${isContent ? "max-h-48 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]" : ""}`}>
      {parts.map((part, i) => {
        if (part.added) {
          return <span key={i} className="bg-green-200 text-green-900">{part.value}</span>;
        }
        if (part.removed) {
          return <span key={i} className="bg-red-200 text-red-900 line-through">{part.value}</span>;
        }
        return <span key={i} className="text-foreground">{part.value}</span>;
      })}
    </Tag>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[#0d61ac]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PublicarPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PendingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardingOne, setDiscardingOne] = useState<number | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetch("/api/admin/pages/pending")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar alteracoes pendentes");
        return res.json();
      })
      .then((data) => {
        const docs = (data.docs ?? []) as PendingPage[];
        setPages(docs);
        setSelected(new Set(docs.map((p) => p.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === pages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pages.map((p) => p.id)));
    }
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    if (selected.size === 0) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/pages/publish-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao publicar");
      }
      toast.success(`${selected.size} pagina${selected.size !== 1 ? "s" : ""} publicada${selected.size !== 1 ? "s" : ""}`);
      router.push("/admin/paginas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao publicar");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscardAll() {
    if (selected.size === 0) return;
    setDiscarding(true);
    setShowDiscardConfirm(false);
    try {
      const res = await fetch("/api/admin/pages/discard-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao descartar");
      }
      const count = selected.size;
      setPages((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
      toast.success(`${count} rascunho${count !== 1 ? "s" : ""} descartado${count !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao descartar");
    } finally {
      setDiscarding(false);
    }
  }

  async function handleDiscardOne(id: number) {
    setDiscardingOne(id);
    try {
      const res = await fetch("/api/admin/pages/discard-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao descartar");
      }
      const page = pages.find((p) => p.id === id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success(`Rascunho de "${page?.title}" descartado`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao descartar");
    } finally {
      setDiscardingOne(null);
    }
  }

  const selectedChanges = pages
    .filter((p) => selected.has(p.id))
    .reduce((acc, p) => acc + getChanges(p).length, 0);

  if (loading) {
    return (
      <AdminShell title="Publicar">
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Publicar">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
          </svg>
          {error}
        </div>
      </AdminShell>
    );
  }

  if (pages.length === 0) {
    return (
      <AdminShell title="Publicar">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Nada para publicar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Todas as alteracoes ja foram publicadas.</p>
          <button
            type="button"
            onClick={() => router.push("/admin/paginas")}
            className="mt-6 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow transition-colors hover:bg-background"
          >
            Voltar para Paginas
          </button>
        </div>
      </AdminShell>
    );
  }

  const isBusy = publishing || discarding;

  return (
    <AdminShell title="Publicar">
      {/* Discard confirmation modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600" aria-hidden="true">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Descartar alteracoes</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tem certeza que deseja descartar as alteracoes de {selected.size} pagina{selected.size !== 1 ? "s" : ""}? Os rascunhos serao apagados e as paginas voltarao ao estado publicado. Esta acao nao pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDiscardAll}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-red-700"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        {/* ── Summary ────────────────────────────────────────────── */}
        <div className="flex gap-6">
          {/* Description */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Resumo</h2>
            <p className="mt-1 text-xs text-muted-foreground">Descricao (opcional)</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Publicar ${selected.size} alterac${selected.size !== 1 ? "oes" : "ao"} em producao`}
              rows={4}
              className="mt-3 w-full resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow placeholder:text-muted-foreground focus:border-[#0d61ac] focus:outline-none focus:ring-2 focus:ring-[#0d61ac]/20"
            />
          </div>

          {/* Stats card */}
          <div className="w-72 shrink-0">
            <div className="rounded-lg border border-border bg-card p-5 shadow">
              <p className="text-center text-sm font-medium text-foreground">
                {selectedChanges} alterac{selectedChanges !== 1 ? "oes" : "ao"} em {selected.size} pagina{selected.size !== 1 ? "s" : ""}
              </p>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || discarding || selected.size === 0}
                  className="w-full rounded-md bg-[#0d61ac] px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#0a4f8c] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {publishing ? "Publicando..." : "Publicar agora"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(true)}
                  disabled={publishing || discarding || selected.size === 0}
                  className="w-full rounded-md border border-red-200 bg-card px-4 py-2.5 text-sm font-medium text-red-600 shadow transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {discarding ? "Descartando..." : "Descartar selecionados"}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── Details ─────────────────────────────────────────────── */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Detalhes</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
              <input
                type="checkbox"
                checked={selected.size === pages.length}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-border text-[#0d61ac] focus:ring-[#0d61ac]/30"
                aria-label="Selecionar todos"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alteracao</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {pages.map((page) => {
                const changes = getChanges(page);
                const isExpanded = expanded.has(page.id);
                const isSelected = selected.has(page.id);

                return (
                  <div key={page.id}>
                    {/* Row header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background cursor-pointer"
                      onClick={() => toggleExpand(page.id)}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(page.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border text-[#0d61ac] focus:ring-[#0d61ac]/30"
                        aria-label={`Selecionar ${page.title}`}
                      />

                      {/* Expand arrow */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(page.id); }}
                        className="rounded p-0.5 text-muted-foreground transition-transform hover:text-muted-foreground"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                          aria-hidden="true"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      {/* Status dot */}
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0d61ac]" />

                      {/* Page info */}
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted-foreground" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span className="truncate text-sm font-medium text-foreground">{page.title}</span>
                        <code className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">/{page.slug}</code>
                      </div>

                      {/* Change count */}
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {changes.length} campo{changes.length !== 1 ? "s" : ""}
                      </span>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-0.5">
                        {/* Discard single */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDiscardOne(page.id); }}
                          disabled={discardingOne === page.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          title="Descartar alteracoes"
                        >
                          {discardingOne === page.id ? (
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                        {/* Link to editor */}
                        <a
                          href={`/admin/paginas/${page.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground"
                          title="Abrir no editor"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      </div>
                    </div>

                    {/* Expanded diff */}
                    {isExpanded && (
                      <div className="border-t border-border bg-background/50 px-4 py-4 pl-16">
                        <div className="space-y-3">
                          {changes.map((change) => (
                            <div key={change.field} className="rounded-lg border border-border bg-card overflow-hidden">
                              <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-1.5">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0d61ac]" aria-hidden="true">
                                  <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84.84-2.872a2 2 0 0 1 .506-.854z" />
                                </svg>
                                <span className="text-[11px] font-semibold text-muted-foreground">{change.label}</span>
                              </div>

                              <div className="px-3 py-2">
                                <div className="mb-1.5 flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1 text-red-500">
                                    <span className="inline-block h-2 w-2 rounded-sm bg-red-200 ring-1 ring-red-300" />
                                    Removido
                                  </span>
                                  <span className="flex items-center gap-1 text-green-600">
                                    <span className="inline-block h-2 w-2 rounded-sm bg-green-200 ring-1 ring-green-300" />
                                    Adicionado
                                  </span>
                                </div>
                                <InlineDiff
                                  oldStr={change.published}
                                  newStr={change.draft}
                                  isContent={change.field === "content"}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
