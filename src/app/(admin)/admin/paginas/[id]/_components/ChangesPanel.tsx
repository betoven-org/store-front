"use client";

import type { Page, EditState } from "../_hooks/types";
import type { SectionChange } from "../_hooks/helpers";
import { getChanges, truncate, FIELD_LABELS } from "../_hooks/helpers";

type ChangesPanelProps = {
  page: Page;
  sectionChanges: SectionChange[];
  onClose: () => void;
};

// ── Badge colors per change type ─────────────────────────────────────────────

const TYPE_STYLES = {
  added: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    ring: "ring-emerald-500/20",
    label: "Adicionada",
  },
  removed: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    ring: "ring-red-500/20",
    label: "Removida",
  },
  modified: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    ring: "ring-amber-500/20",
    label: "Modificada",
  },
  reordered: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    ring: "ring-blue-500/20",
    label: "Reordenada",
  },
} as const;

function DiffValue({ label, value, variant }: { label: string; value: string; variant: "old" | "new" }) {
  return (
    <div className="flex-1 min-w-0">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className={`mt-0.5 text-[12px] break-words rounded px-1.5 py-1 font-mono ${
        variant === "old"
          ? "bg-red-500/5 text-red-300 line-through"
          : "bg-emerald-500/5 text-emerald-300"
      }`}>
        {value || "(vazio)"}
      </p>
    </div>
  );
}

export function ChangesPanel({ page, sectionChanges, onClose }: ChangesPanelProps) {
  const metadataChanges = getChanges(page);
  const totalChanges = metadataChanges.length + sectionChanges.length;

  return (
    <div className="flex flex-col w-[340px] min-w-[340px] border-r border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-foreground">Alterações</h2>
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning ring-1 ring-warning/20">
            {totalChanges}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Fechar painel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {totalChanges === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30 mb-3">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm text-muted-foreground">Nenhuma alteração pendente.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tudo está sincronizado com a versão publicada.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Metadata changes */}
            {metadataChanges.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Metadados
                  </span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {metadataChanges.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {metadataChanges.map((change) => (
                    <div key={change.field} className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                      <span className="text-[12px] font-semibold text-foreground">{change.label}</span>
                      <div className="flex gap-2">
                        <DiffValue label="Publicado" value={truncate(change.published, 120)} variant="old" />
                        <DiffValue label="Rascunho" value={truncate(change.draft, 120)} variant="new" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section changes */}
            {sectionChanges.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Seções
                  </span>
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {sectionChanges.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {sectionChanges.map((change) => {
                    const style = TYPE_STYLES[change.type];
                    return (
                      <div key={change.id} className="rounded-lg border border-border bg-background/50 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
                            {style.label}
                          </span>
                          <span className="text-[12px] font-semibold text-foreground truncate">
                            {change.component}
                          </span>
                        </div>

                        {/* Prop diffs for modified/added sections */}
                        {change.propDiffs && change.propDiffs.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {change.propDiffs.slice(0, 5).map((diff) => (
                              <div key={diff.key} className="rounded border border-border/50 bg-card/50 px-2.5 py-1.5">
                                <span className="text-[11px] font-medium text-muted-foreground">{diff.key}</span>
                                <div className="flex gap-2 mt-0.5">
                                  <span className="text-[11px] text-red-400/80 line-through truncate flex-1">{truncate(diff.published, 60)}</span>
                                  <span className="text-[11px] text-muted-foreground flex-shrink-0">→</span>
                                  <span className="text-[11px] text-emerald-400 truncate flex-1">{truncate(diff.draft, 60)}</span>
                                </div>
                              </div>
                            ))}
                            {change.propDiffs.length > 5 && (
                              <p className="text-[10px] text-muted-foreground px-1">
                                +{change.propDiffs.length - 5} campos alterados
                              </p>
                            )}
                          </div>
                        )}

                        {change.details && !change.propDiffs && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{change.details}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {totalChanges > 0 && (
        <div className="border-t border-border px-4 py-2.5 bg-warning/5">
          <p className="text-[11px] text-warning">
            {totalChanges} alteraç{totalChanges !== 1 ? "ões" : "ão"} pendente{totalChanges !== 1 ? "s" : ""} — publique para aplicar.
          </p>
        </div>
      )}
    </div>
  );
}
