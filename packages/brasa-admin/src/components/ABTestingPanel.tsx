"use client";

import { useMemo } from "react";
import type { SectionBlock } from "@brasa/core/manifest";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconFlask() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3h6" />
      <path d="M9 3v8l-4 9h14l-4-9V3" />
      <path d="M6.5 15h11" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconMonitor() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconWarn() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ── Variant color ─────────────────────────────────────────────────────────────

function variantColor(index: number): string {
  const hues = [217, 142, 25, 330, 170, 280];
  const h = hues[index % hues.length];
  return `hsl(${h}, 70%, 52%)`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ABTestingPanelProps = {
  block: SectionBlock;
  onChange: (partial: Partial<SectionBlock>) => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ABTestingPanel({ block, onChange }: ABTestingPanelProps) {
  const variants = block.variants ?? [];

  const totalWeight = useMemo(
    () => variants.reduce((sum, v) => sum + (v.weight ?? 0), 0),
    [variants]
  );

  const isOverflow = totalWeight > 100;

  function addVariant() {
    const next = [
      ...variants,
      {
        name: `Variante ${variants.length + 1}`,
        weight: Math.max(0, Math.floor((100 - totalWeight) / 2)),
        props: { ...block.props },
      },
    ];
    onChange({ variants: next });
  }

  function removeVariant(index: number) {
    const next = variants.filter((_, i) => i !== index);
    onChange({ variants: next.length > 0 ? next : undefined });
  }

  function updateVariant(index: number, patch: Partial<{ name: string; weight: number }>) {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange({ variants: next });
  }

  const device = block.matcher?.device ?? "all";
  const isDeferred = block.deferred ?? false;

  function setDevice(value: "all" | "mobile" | "desktop") {
    const matcher = { ...block.matcher, device: value };
    onChange({ matcher: value === "all" ? undefined : matcher });
  }

  function setDeferred(checked: boolean) {
    onChange({ deferred: checked || undefined });
  }

  return (
    <div className="space-y-4">
      {/* ── A/B Testing section ──────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-background">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <IconFlask />
              Testes A/B
            </span>
            {variants.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {variants.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Adicionar variante"
          >
            <IconPlus />
            Variante
          </button>
        </div>

        <div className="p-3">
          {variants.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-muted-foreground">
              Sem variantes — exibe a versão padrão.
            </p>
          ) : (
            <div className="space-y-3">
              {/* distribution bar */}
              <div className="space-y-1">
                <div
                  className="flex h-2 w-full overflow-hidden rounded-full bg-accent"
                  role="img"
                  aria-label={`Distribuição total: ${totalWeight}%`}
                >
                  {variants.map((v, i) => {
                    const pct = Math.min(v.weight ?? 0, 100);
                    return (
                      <div
                        key={i}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: variantColor(i),
                          transition: "width 0.2s ease",
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {variants.length} variante{variants.length !== 1 ? "s" : ""}
                  </span>
                  {isOverflow ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
                      <IconWarn />
                      {totalWeight}% (acima de 100%)
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{totalWeight}% distribuído</span>
                  )}
                </div>
              </div>

              {/* variant cards */}
              <div className="space-y-2">
                {variants.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    {/* color dot */}
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: variantColor(i) }}
                      aria-hidden="true"
                    />

                    {/* name */}
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => updateVariant(i, { name: e.target.value })}
                      aria-label={`Nome da variante ${i + 1}`}
                      className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                      placeholder={`Variante ${i + 1}`}
                    />

                    {/* weight */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <input
                        type="number"
                        value={v.weight ?? 0}
                        onChange={(e) => updateVariant(i, { weight: Math.max(0, Math.min(100, Number(e.target.value))) })}
                        aria-label={`Peso da variante ${i + 1} em porcentagem`}
                        className={`w-11 rounded border px-1.5 py-0.5 text-center text-[11px] font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring ${
                          isOverflow ? "border-destructive/60 text-destructive" : "border-border text-foreground"
                        }`}
                        min={0}
                        max={100}
                      />
                      <span className="text-[10px] text-muted-foreground">%</span>
                    </div>

                    {/* remove */}
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      aria-label={`Remover ${v.name}`}
                      className="flex-shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-danger-bg hover:text-destructive"
                    >
                      <IconX />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Display conditions ────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Condições de exibição
          </span>
        </div>

        <div className="space-y-2 p-3">
          {/* device selector */}
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
            <span className="flex-shrink-0 text-muted-foreground">
              <IconMonitor />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground">Dispositivo</p>
              <p className="text-[10px] text-muted-foreground">Exibir apenas em</p>
            </div>
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value as "all" | "mobile" | "desktop")}
              aria-label="Dispositivo de exibição"
              className="flex-shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Todos</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* lazy toggle */}
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
            <span className="flex-shrink-0 text-muted-foreground">
              <IconClock />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground">Carregamento lazy</p>
              <p className="text-[10px] text-muted-foreground">Adiar até o usuário rolar</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isDeferred}
              aria-label="Ativar carregamento lazy"
              onClick={() => setDeferred(!isDeferred)}
              className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isDeferred ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isDeferred ? "translate-x-4" : "translate-x-0"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ABTestingPanel;
