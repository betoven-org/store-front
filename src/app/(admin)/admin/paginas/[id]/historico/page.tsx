"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminShell } from "@brasa/admin";

/* ── Types ─────────────────────────────────────────────────────────── */

type PageInfo = {
  id: number;
  title: string;
  slug: string;
};

type PageVersionSummary = {
  id: number;
  version: number;
  title: string | null;
  publishedBy: string | null;
  publishedAt: string;
  sectionCount: number;
};

type SectionBlock = {
  id: string;
  component: string;
  props: Record<string, unknown>;
};

type FullVersion = {
  id: number;
  version: number;
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  content: string | null;
  sections: SectionBlock[] | null;
  publishedBy: string | null;
  publishedAt: string;
};

/* ── Diff helpers ──────────────────────────────────────────────────── */

type TextDiffLine = { type: "same" | "added" | "removed"; text: string };

function diffText(oldText: string, newText: string): TextDiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: TextDiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      result.push({ type: "same", text: oldLine ?? "" });
    } else {
      if (oldLine !== undefined) {
        result.push({ type: "removed", text: oldLine });
      }
      if (newLine !== undefined) {
        result.push({ type: "added", text: newLine });
      }
    }
  }
  return result;
}

type MetaDiffEntry = { key: string; label: string; old: string; new: string };

const META_FIELDS: { key: string; label: string }[] = [
  { key: "title", label: "Titulo" },
  { key: "metaTitle", label: "Meta Title" },
  { key: "metaDescription", label: "Meta Description" },
  { key: "ogTitle", label: "OG Title" },
  { key: "ogDescription", label: "OG Description" },
];

function diffMetadata(
  oldVersion: FullVersion,
  newVersion: FullVersion
): MetaDiffEntry[] {
  const result: MetaDiffEntry[] = [];
  for (const { key, label } of META_FIELDS) {
    const oldVal = ((oldVersion as Record<string, unknown>)[key] as string) ?? "";
    const newVal = ((newVersion as Record<string, unknown>)[key] as string) ?? "";
    if (oldVal !== newVal) {
      result.push({ key, label, old: oldVal, new: newVal });
    }
  }
  return result;
}

type SectionDiff = {
  type: "added" | "removed" | "modified" | "unchanged";
  component: string;
  id: string;
  propChanges?: { key: string; old: string; new: string }[];
};

function formatPropVal(val: unknown): string {
  if (val === null || val === undefined) return "(vazio)";
  if (typeof val === "boolean") return val ? "sim" : "nao";
  if (typeof val === "object") {
    const s = JSON.stringify(val);
    return s.length > 120 ? s.slice(0, 120) + "..." : s;
  }
  const s = String(val);
  return s.length > 120 ? s.slice(0, 120) + "..." : s;
}

function diffSections(
  oldSections: SectionBlock[],
  newSections: SectionBlock[]
): SectionDiff[] {
  const oldMap = new Map(oldSections.map((s) => [s.id, s]));
  const newMap = new Map(newSections.map((s) => [s.id, s]));
  const result: SectionDiff[] = [];

  // Process new sections in order
  for (const section of newSections) {
    const old = oldMap.get(section.id);
    if (!old) {
      // Added
      const propChanges = Object.entries(section.props).map(([k, v]) => ({
        key: k,
        old: "",
        new: formatPropVal(v),
      }));
      result.push({ type: "added", component: section.component, id: section.id, propChanges });
    } else {
      // Exists in both — check for modifications
      const allKeys = new Set([...Object.keys(old.props), ...Object.keys(section.props)]);
      const propChanges: { key: string; old: string; new: string }[] = [];
      for (const k of allKeys) {
        const oldStr = JSON.stringify(old.props[k]);
        const newStr = JSON.stringify(section.props[k]);
        if (oldStr !== newStr) {
          propChanges.push({
            key: k,
            old: formatPropVal(old.props[k]),
            new: formatPropVal(section.props[k]),
          });
        }
      }
      if (propChanges.length > 0 || old.component !== section.component) {
        result.push({ type: "modified", component: section.component, id: section.id, propChanges });
      } else {
        result.push({ type: "unchanged", component: section.component, id: section.id });
      }
    }
  }

  // Removed sections (in old but not in new)
  for (const section of oldSections) {
    if (!newMap.has(section.id)) {
      result.push({ type: "removed", component: section.component, id: section.id });
    }
  }

  return result;
}

/* ── Spinner ───────────────────────────────────────────────────────── */

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

/* ── Main page ─────────────────────────────────────────────────────── */

export default function HistoricoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Two selected version IDs for comparison
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null]);

  // Full version data cache
  const [versionCache, setVersionCache] = useState<Map<number, FullVersion>>(new Map());
  const [loadingVersion, setLoadingVersion] = useState<number | null>(null);
  const [rollingBack, setRollingBack] = useState(false);

  // Fetch page info and versions
  useEffect(() => {
    async function load() {
      try {
        const [pageRes, versionsRes] = await Promise.all([
          fetch(`/api/admin/pages/${id}`),
          fetch(`/api/admin/pages/${id}/versions`),
        ]);
        if (!pageRes.ok) throw new Error("Erro ao carregar pagina");
        if (!versionsRes.ok) throw new Error("Erro ao carregar versoes");

        const pageData = await pageRes.json();
        setPageInfo({ id: pageData.id, title: pageData.title, slug: pageData.slug });

        const versionsData = await versionsRes.json();
        setVersions(versionsData.docs ?? []);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Fetch full version details
  const fetchFullVersion = useCallback(
    async (versionId: number) => {
      if (versionCache.has(versionId)) return;
      setLoadingVersion(versionId);
      try {
        const res = await fetch(`/api/admin/pages/${id}/versions/${versionId}`);
        if (!res.ok) throw new Error("Erro ao carregar versao");
        const data: FullVersion = await res.json();
        setVersionCache((prev) => new Map(prev).set(versionId, data));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar versao");
      } finally {
        setLoadingVersion(null);
      }
    },
    [id, versionCache]
  );

  function handleSelectVersion(versionId: number) {
    setSelectedVersions((prev) => {
      // If already selected, deselect
      if (prev[0] === versionId) return [prev[1], null];
      if (prev[1] === versionId) return [prev[0], null];

      // If no slots filled, fill first
      if (prev[0] === null) {
        fetchFullVersion(versionId);
        return [versionId, null];
      }
      // If one slot filled, fill second
      if (prev[1] === null) {
        fetchFullVersion(versionId);
        return [prev[0], versionId];
      }
      // Both filled — replace second
      fetchFullVersion(versionId);
      return [prev[0], versionId];
    });
  }

  async function handleRollback(versionId: number) {
    if (!confirm("Restaurar esta versao? A pagina atual sera substituida.")) return;
    setRollingBack(true);
    try {
      const res = await fetch(`/api/admin/pages/${id}/versions/${versionId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao restaurar");
      toast.success("Versao restaurada");
      router.push(`/admin/paginas/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar");
    } finally {
      setRollingBack(false);
    }
  }

  const isSelected = (vId: number) =>
    selectedVersions[0] === vId || selectedVersions[1] === vId;

  // Determine older/newer for diff direction
  const bothSelected = selectedVersions[0] !== null && selectedVersions[1] !== null;
  let olderVersion: FullVersion | null = null;
  let newerVersion: FullVersion | null = null;

  if (bothSelected) {
    const v1 = versionCache.get(selectedVersions[0]!);
    const v2 = versionCache.get(selectedVersions[1]!);
    if (v1 && v2) {
      if (v1.version < v2.version) {
        olderVersion = v1;
        newerVersion = v2;
      } else {
        olderVersion = v2;
        newerVersion = v1;
      }
    }
  }

  // Single version detail view
  const singleSelected =
    selectedVersions[0] !== null && selectedVersions[1] === null
      ? versionCache.get(selectedVersions[0])
      : null;

  if (loading) {
    return (
      <AdminShell title="Historico" headerExtra={null}>
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  if (fetchError || !pageInfo) {
    return (
      <AdminShell title="Historico" headerExtra={null}>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-red-50 p-6 text-sm text-destructive">
          {fetchError ?? "Pagina nao encontrada"}
        </div>
      </AdminShell>
    );
  }

  const metaDiffs = olderVersion && newerVersion ? diffMetadata(olderVersion, newerVersion) : [];
  const sectionDiffs =
    olderVersion && newerVersion
      ? diffSections(
          (olderVersion.sections ?? []) as SectionBlock[],
          (newerVersion.sections ?? []) as SectionBlock[]
        )
      : [];
  const contentChanged =
    olderVersion && newerVersion && (olderVersion.content ?? "") !== (newerVersion.content ?? "");
  const contentDiffLines =
    olderVersion && newerVersion && contentChanged
      ? diffText(olderVersion.content ?? "", newerVersion.content ?? "")
      : [];

  return (
    <AdminShell title="Historico de versoes" headerExtra={null}>
      {/* Breadcrumb + back */}
      <div className="mb-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <a href="/admin/paginas" className="hover:text-foreground transition-colors">
            Paginas
          </a>
          <span>/</span>
          <a
            href={`/admin/paginas/${id}`}
            className="hover:text-foreground transition-colors"
          >
            {pageInfo.title}
          </a>
          <span>/</span>
          <span className="text-foreground font-medium">Historico</span>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href={`/admin/paginas/${id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-accent transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Voltar ao editor
          </a>
          <h1 className="text-lg font-semibold text-foreground">
            {pageInfo.title} — Historico
          </h1>
        </div>
      </div>

      {/* Main layout: version list + diff panel */}
      <div className="flex gap-6" style={{ minHeight: "calc(100vh - 14rem)" }}>
        {/* Left panel: version list */}
        <div className="w-80 shrink-0">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold text-foreground">
                {versions.length} vers{versions.length !== 1 ? "oes" : "ao"}
              </p>
              {bothSelected && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  2 versoes selecionadas para comparacao
                </p>
              )}
            </div>
            <div className="divide-y divide-border max-h-[calc(100vh-18rem)] overflow-y-auto">
              {versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40" aria-hidden="true">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M12 7v5l4 2" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    Nenhuma versao encontrada
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publique a pagina para criar a primeira versao.
                  </p>
                </div>
              ) : (
                versions.map((v, idx) => {
                  const selected = isSelected(v.id);
                  const isCurrent = idx === 0;
                  return (
                    <div
                      key={v.id}
                      className={`px-4 py-3 transition-colors ${
                        selected
                          ? "bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Checkbox for comparison */}
                        <button
                          type="button"
                          onClick={() => handleSelectVersion(v.id)}
                          className={`shrink-0 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                            selected
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                          aria-label={`Selecionar v${v.version} para comparacao`}
                        >
                          {selected && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>

                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-accent px-1.5 text-[10px] font-bold text-muted-foreground">
                          v{v.version}
                        </span>

                        {isCurrent && (
                          <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                            Atual
                          </span>
                        )}

                        <div className="flex-1" />

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRollback(v.id)}
                            disabled={rollingBack}
                            className="rounded px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            Restaurar
                          </button>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs font-medium text-foreground truncate pl-6">
                        {v.title || "(sem titulo)"}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground pl-6">
                        <span>
                          {new Date(v.publishedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {v.publishedBy && (
                          <span className="truncate max-w-[120px]">{v.publishedBy}</span>
                        )}
                        <span>
                          {v.sectionCount} section{v.sectionCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right panel: diff or single version detail */}
        <div className="flex-1 min-w-0">
          {loadingVersion !== null && (
            <div className="flex items-center justify-center py-12">
              <Spinner small />
              <span className="ml-2 text-xs text-muted-foreground">Carregando versao...</span>
            </div>
          )}

          {/* Nothing selected */}
          {selectedVersions[0] === null && selectedVersions[1] === null && loadingVersion === null && (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted-foreground/30" aria-hidden="true">
                  <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
                  <path d="M15 3v4a1 1 0 0 0 1 1h4" />
                </svg>
                <p className="text-sm font-medium text-muted-foreground">
                  Selecione versoes para comparar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Marque 1 versao para ver detalhes, ou 2 para comparar lado a lado.
                </p>
              </div>
            </div>
          )}

          {/* Single version detail */}
          {singleSelected && loadingVersion === null && (
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-3 flex items-center gap-3">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-accent px-2 text-xs font-bold text-muted-foreground">
                  v{singleSelected.version}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {singleSelected.title || "(sem titulo)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(singleSelected.publishedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="p-5 space-y-4">
                {/* Metadata */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Metadados
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {META_FIELDS.map(({ key, label }) => {
                      const val = (singleSelected as Record<string, unknown>)[key];
                      return (
                        <div key={key}>
                          <span className="text-muted-foreground">{label}</span>
                          <p className="mt-0.5 font-medium text-foreground break-words">
                            {(val as string) || <span className="text-muted-foreground italic">(vazio)</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sections */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Sections ({((singleSelected.sections as SectionBlock[] | null) ?? []).length})
                  </p>
                  <div className="space-y-1.5">
                    {((singleSelected.sections as SectionBlock[] | null) ?? []).map((s, i) => (
                      <div key={s.id || i} className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2">
                        <span className="text-[10px] font-bold text-muted-foreground w-5">{i + 1}</span>
                        <span className="text-xs font-medium text-foreground">{s.component}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content */}
                {singleSelected.content && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Conteudo
                    </p>
                    <pre className="whitespace-pre-wrap break-words rounded border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground max-h-60 overflow-y-auto">
                      {singleSelected.content}
                    </pre>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Selecione outra versao para comparar com esta.
                </p>
              </div>
            </div>
          )}

          {/* Diff view */}
          {olderVersion && newerVersion && loadingVersion === null && (
            <div className="space-y-4">
              {/* Diff header */}
              <div className="rounded-lg border border-border bg-card px-5 py-3 flex items-center gap-3">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-red-100 px-2 text-xs font-bold text-red-700">
                  v{olderVersion.version}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-green-100 px-2 text-xs font-bold text-green-700">
                  v{newerVersion.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  Comparando v{olderVersion.version} com v{newerVersion.version}
                </span>
              </div>

              {/* No changes */}
              {metaDiffs.length === 0 &&
                sectionDiffs.every((d) => d.type === "unchanged") &&
                !contentChanged && (
                  <div className="rounded-lg border border-border bg-card px-5 py-12 text-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted-foreground/40" aria-hidden="true">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p className="text-sm font-medium text-muted-foreground">Versoes identicas</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nenhuma diferenca encontrada entre v{olderVersion.version} e v{newerVersion.version}.
                    </p>
                  </div>
                )}

              {/* Metadata diff */}
              {metaDiffs.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-5 py-3">
                    <p className="text-xs font-semibold text-foreground">Metadados</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {metaDiffs.length} campo{metaDiffs.length !== 1 ? "s" : ""} alterado{metaDiffs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {metaDiffs.map((d) => (
                      <div key={d.key} className="px-5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          {d.label}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded border border-red-200 bg-red-50 px-3 py-2">
                            <span className="block text-[9px] font-bold uppercase text-red-500 mb-1">
                              v{olderVersion.version}
                            </span>
                            <p className="text-xs text-red-700 break-words">
                              {d.old || <span className="italic opacity-60">(vazio)</span>}
                            </p>
                          </div>
                          <div className="rounded border border-green-200 bg-green-50 px-3 py-2">
                            <span className="block text-[9px] font-bold uppercase text-green-600 mb-1">
                              v{newerVersion.version}
                            </span>
                            <p className="text-xs text-green-700 break-words">
                              {d.new || <span className="italic opacity-60">(vazio)</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections diff */}
              {sectionDiffs.some((d) => d.type !== "unchanged") && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-5 py-3">
                    <p className="text-xs font-semibold text-foreground">Sections</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {sectionDiffs.filter((d) => d.type === "added").length > 0 &&
                        `${sectionDiffs.filter((d) => d.type === "added").length} adicionada${sectionDiffs.filter((d) => d.type === "added").length !== 1 ? "s" : ""}`}
                      {sectionDiffs.filter((d) => d.type === "removed").length > 0 &&
                        `${sectionDiffs.filter((d) => d.type === "added").length > 0 ? ", " : ""}${sectionDiffs.filter((d) => d.type === "removed").length} removida${sectionDiffs.filter((d) => d.type === "removed").length !== 1 ? "s" : ""}`}
                      {sectionDiffs.filter((d) => d.type === "modified").length > 0 &&
                        `${sectionDiffs.filter((d) => d.type !== "unchanged" && d.type !== "modified").length > 0 ? ", " : ""}${sectionDiffs.filter((d) => d.type === "modified").length} modificada${sectionDiffs.filter((d) => d.type === "modified").length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {sectionDiffs.map((d) => {
                      if (d.type === "unchanged") {
                        return (
                          <div key={d.id} className="px-5 py-2.5 flex items-center gap-2 opacity-40">
                            <span className="text-xs text-muted-foreground font-mono">{d.component}</span>
                            <span className="text-[10px] text-muted-foreground">(sem alteracoes)</span>
                          </div>
                        );
                      }

                      const bgClass =
                        d.type === "added"
                          ? "border-l-4 border-l-green-400"
                          : d.type === "removed"
                            ? "border-l-4 border-l-red-400"
                            : "border-l-4 border-l-amber-400";

                      const badgeClass =
                        d.type === "added"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : d.type === "removed"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200";

                      const badgeLabel =
                        d.type === "added"
                          ? "Adicionada"
                          : d.type === "removed"
                            ? "Removida"
                            : "Modificada";

                      return (
                        <div key={d.id} className={`px-5 py-3 ${bgClass}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{d.component}</span>
                          </div>

                          {d.propChanges && d.propChanges.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {d.propChanges.map((pc) => (
                                <div key={pc.key} className="rounded border border-border bg-background px-3 py-2">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                    {pc.key}
                                  </span>
                                  <div className="mt-1 space-y-1">
                                    {d.type !== "added" && pc.old && (
                                      <div className="flex items-start gap-1.5">
                                        <span className="mt-0.5 shrink-0 text-red-500 text-[10px] font-bold">-</span>
                                        <span className="text-[11px] text-red-700 break-words bg-red-50 rounded px-1.5 py-0.5">
                                          {pc.old}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-start gap-1.5">
                                      <span className="mt-0.5 shrink-0 text-green-600 text-[10px] font-bold">+</span>
                                      <span className="text-[11px] text-green-700 break-words bg-green-50 rounded px-1.5 py-0.5">
                                        {pc.new}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Content diff */}
              {contentChanged && contentDiffLines.length > 0 && (
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-5 py-3">
                    <p className="text-xs font-semibold text-foreground">Conteudo</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <pre className="font-mono text-[11px] leading-relaxed">
                      {contentDiffLines.map((line, i) => {
                        const bgClass =
                          line.type === "added"
                            ? "bg-green-50 text-green-700"
                            : line.type === "removed"
                              ? "bg-red-50 text-red-700"
                              : "text-muted-foreground";
                        const prefix =
                          line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
                        return (
                          <div key={i} className={`px-5 py-0.5 ${bgClass}`}>
                            <span className="inline-block w-4 select-none opacity-60">{prefix}</span>
                            {line.text || "\u00A0"}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waiting for second version data */}
          {bothSelected && (!olderVersion || !newerVersion) && loadingVersion === null && (
            <div className="flex items-center justify-center py-12">
              <Spinner small />
              <span className="ml-2 text-xs text-muted-foreground">Carregando versoes...</span>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
