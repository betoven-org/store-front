"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell, SectionEditor, BrasaPageLoader } from "@brasa/admin";

type SectionSchema = Record<string, any>;
type ManifestSection = { key: string; title: string; props: SectionSchema };
type GlobalSections = {
  header?: { id: string; component: string; props: Record<string, any> } | null;
  footer?: { id: string; component: string; props: Record<string, any> } | null;
};

export default function GlobalSectionsPage() {
  const [manifest, setManifest] = useState<ManifestSection[]>([]);
  const [globalSections, setGlobalSections] = useState<GlobalSections>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/manifest").then((r) => r.json()),
      fetch("/api/admin/global-sections").then((r) => r.json()),
    ])
      .then(([mfData, gsData]) => {
        const sections = mfData?.sections ?? mfData ?? [];
        setManifest(Array.isArray(sections) ? sections : []);
        setGlobalSections(gsData ?? {});
      })
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  const headerSchema = manifest.find((s) => s.key === "Header");
  const footerSchema = manifest.find((s) => s.key === "Footer");

  const handleHeaderChange = useCallback(
    (props: Record<string, unknown>) => {
      setGlobalSections((prev) => ({
        ...prev,
        header: { id: "global-header", component: "Header", props },
      }));
    },
    []
  );

  const handleFooterChange = useCallback(
    (props: Record<string, unknown>) => {
      setGlobalSections((prev) => ({
        ...prev,
        footer: { id: "global-footer", component: "Footer", props },
      }));
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/global-sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: globalSections.header
            ? { id: globalSections.header.id, props: globalSections.header.props }
            : null,
          footer: globalSections.footer
            ? { id: globalSections.footer.id, props: globalSections.footer.props }
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Erro ao salvar");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Sections Globais">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Sections Globais">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sections Globais</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure o Header e Footer que aparecem em todas as páginas automaticamente.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            Salvo com sucesso!
          </div>
        )}

        {/* Header Section */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-medium text-foreground">Header</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configurações do cabeçalho global do site.
            </p>
          </div>
          <div className="px-5 py-4">
            {headerSchema ? (
              <SectionEditor
                schema={headerSchema.props}
                values={(globalSections.header?.props as Record<string, unknown>) ?? {}}
                onChange={handleHeaderChange}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Section &quot;Header&quot; não encontrada no manifest. Registre o frontend para habilitar a edição.
              </p>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-medium text-foreground">Footer</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Configurações do rodapé global do site.
            </p>
          </div>
          <div className="px-5 py-4">
            {footerSchema ? (
              <SectionEditor
                schema={footerSchema.props}
                values={(globalSections.footer?.props as Record<string, unknown>) ?? {}}
                onChange={handleFooterChange}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Section &quot;Footer&quot; não encontrada no manifest. Registre o frontend para habilitar a edição.
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
