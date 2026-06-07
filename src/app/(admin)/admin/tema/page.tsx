"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AdminShell } from "@brasa/admin";

type ThemeTokens = {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  radius: string;
  spacing: { section: string };
};

type ColorEntry = { key: string; label: string; group: string };

const COLOR_MAP: ColorEntry[] = [
  { key: "primary", label: "Primaria", group: "Base" },
  { key: "primaryForeground", label: "Primaria (texto)", group: "Base" },
  { key: "background", label: "Fundo", group: "Base" },
  { key: "foreground", label: "Texto principal", group: "Base" },
  { key: "secondary", label: "Secundaria", group: "Base" },
  { key: "secondaryForeground", label: "Secundaria (texto)", group: "Base" },
  { key: "muted", label: "Muted", group: "Neutros" },
  { key: "mutedForeground", label: "Muted (texto)", group: "Neutros" },
  { key: "accent", label: "Accent", group: "Neutros" },
  { key: "accentForeground", label: "Accent (texto)", group: "Neutros" },
  { key: "border", label: "Bordas", group: "Neutros" },
  { key: "ring", label: "Focus ring", group: "Neutros" },
  { key: "destructive", label: "Erro / Perigo", group: "Semanticas" },
  { key: "success", label: "Sucesso", group: "Semanticas" },
  { key: "warning", label: "Aviso", group: "Semanticas" },
];

function oklchToHex(oklch: string): string {
  // Simple preview — browsers render oklch natively, we just show a swatch
  return oklch;
}

function ColorSwatch({ value }: { value: string }) {
  return (
    <div
      className="h-8 w-8 rounded-md border border-border shadow-sm flex-shrink-0"
      style={{ backgroundColor: value }}
      aria-hidden="true"
    />
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <ColorSwatch value={value} />
      <div className="flex-1 min-w-0">
        <label className="block text-[12px] font-semibold text-foreground mb-1">
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground font-mono shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="oklch(0.5 0.1 200)"
        />
      </div>
    </div>
  );
}

function FontField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="py-2">
      <label className="block text-[12px] font-semibold text-foreground mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Inter, system-ui, sans-serif"
      />
      <p
        className="mt-1 text-xs text-muted-foreground truncate"
        style={{ fontFamily: value }}
      >
        AaBbCc 123 — Visualizacao da fonte
      </p>
    </div>
  );
}

export default function ThemeEditorPage() {
  const [theme, setTheme] = useState<ThemeTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/theme")
      .then((res) => res.json())
      .then(setTheme)
      .catch(() => toast.error("Erro ao carregar tema"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!theme) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      toast.success("Tema salvo");
    } catch {
      toast.error("Erro ao salvar tema");
    } finally {
      setSaving(false);
    }
  }, [theme]);

  // Keyboard shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  if (loading || !theme) {
    return (
      <AdminShell title="Tema">
        <div className="flex items-center justify-center py-16">
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  function updateColor(key: string, value: string) {
    setTheme((prev) =>
      prev ? { ...prev, colors: { ...prev.colors, [key]: value } } : prev,
    );
  }

  function updateFont(key: string, value: string) {
    setTheme((prev) =>
      prev ? { ...prev, fonts: { ...prev.fonts, [key]: value } } : prev,
    );
  }

  // Group colors
  const groups = new Map<string, ColorEntry[]>();
  for (const entry of COLOR_MAP) {
    if (!groups.has(entry.group)) groups.set(entry.group, []);
    groups.get(entry.group)!.push(entry);
  }

  return (
    <AdminShell title="Tema">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Design Tokens</h1>
            <p className="text-sm text-muted-foreground">
              Cores, tipografia e espacamentos do frontend. Usa OKLch pra consistencia perceptual.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-4 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar tema"}
          </button>
        </div>

        {/* Color Groups */}
        {Array.from(groups.entries()).map(([group, entries]) => (
          <section key={group} className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h2>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {entries.map((entry) => (
                <ColorField
                  key={entry.key}
                  label={entry.label}
                  value={theme.colors[entry.key] || ""}
                  onChange={(v) => updateColor(entry.key, v)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Typography */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tipografia
          </h2>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <FontField
              label="Sans (corpo)"
              value={theme.fonts.sans}
              onChange={(v) => updateFont("sans", v)}
            />
            <FontField
              label="Mono (codigo)"
              value={theme.fonts.mono}
              onChange={(v) => updateFont("mono", v)}
            />
            <FontField
              label="Display (titulos)"
              value={theme.fonts.display}
              onChange={(v) => updateFont("display", v)}
            />
          </div>
        </section>

        {/* Spacing & Radius */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Espacamento & Bordas
          </h2>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div className="py-2">
              <label className="block text-[12px] font-semibold text-foreground mb-1">
                Border radius
              </label>
              <input
                type="text"
                value={theme.radius}
                onChange={(e) =>
                  setTheme((prev) => (prev ? { ...prev, radius: e.target.value } : prev))
                }
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground font-mono shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="0.5rem"
              />
              <div
                className="mt-2 h-8 w-16 border-2 border-primary bg-primary/10"
                style={{ borderRadius: theme.radius }}
                aria-hidden="true"
              />
            </div>
            <div className="py-2">
              <label className="block text-[12px] font-semibold text-foreground mb-1">
                Espaco entre sections
              </label>
              <input
                type="text"
                value={theme.spacing.section}
                onChange={(e) =>
                  setTheme((prev) =>
                    prev
                      ? { ...prev, spacing: { ...prev.spacing, section: e.target.value } }
                      : prev,
                  )
                }
                className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground font-mono shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="4rem"
              />
            </div>
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </h2>
          <div
            className="rounded-lg p-6 space-y-3"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.foreground,
              fontFamily: theme.fonts.sans,
              borderRadius: theme.radius,
            }}
          >
            <h3
              className="text-xl font-bold"
              style={{ fontFamily: theme.fonts.display, color: theme.colors.foreground }}
            >
              Titulo de exemplo
            </h3>
            <p style={{ color: theme.colors.mutedForeground }}>
              Texto de corpo com a cor muted. Assim fica o conteudo no frontend.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.primaryForeground,
                  borderRadius: theme.radius,
                }}
              >
                Botao primario
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium border"
                style={{
                  backgroundColor: theme.colors.secondary,
                  color: theme.colors.secondaryForeground,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius,
                }}
              >
                Botao secundario
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <span
                className="px-2 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: theme.colors.success + "22", color: theme.colors.success }}
              >
                Sucesso
              </span>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: theme.colors.warning + "22", color: theme.colors.warning }}
              >
                Aviso
              </span>
              <span
                className="px-2 py-0.5 text-xs font-medium rounded"
                style={{ backgroundColor: theme.colors.destructive + "22", color: theme.colors.destructive }}
              >
                Erro
              </span>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
