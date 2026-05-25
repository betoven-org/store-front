"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, FormField, ImageUpload, useTenant, useTenantRefetch } from "@brasa/admin";
import { useSettings } from "@/hooks/useSettings";

export default function IdentidadePage() {
  const {
    settings,
    loading,
    saving,
    logoPreview,
    faviconPreview,
    handleChange,
    handleSave,
    onLogoChange,
    onFaviconChange,
  } = useSettings();

  const tenant = useTenant();
  const refetchTenant = useTenantRefetch();
  const [frontendUrl, setFrontendUrl] = useState("");
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantLoaded, setTenantLoaded] = useState(false);

  if (tenant && !tenantLoaded) {
    setFrontendUrl(tenant.frontendUrl || "");
    setTenantLoaded(true);
  }

  async function handleSaveAll() {
    await handleSave();
    // Also save frontend URL if changed
    if (tenant && frontendUrl !== (tenant.frontendUrl || "")) {
      try {
        const res = await fetch("/api/admin/tenant-info", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frontendUrl }),
        });
        if (res.ok) refetchTenant();
      } catch {}
    }
    toast.success("Configuracoes salvas");
  }

  if (loading) {
    return (
      <AdminShell title="Identidade">
        <div className="flex items-center justify-center py-20">
          <svg className="h-5 w-5 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        </div>
      </AdminShell>
    );
  }

  const saveButton = (
    <button
      type="button"
      onClick={handleSaveAll}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[12px] font-medium h-7 px-3 transition-all hover:brightness-[0.97] disabled:opacity-50"
    >
      {saving ? "Salvando..." : "Salvar alteracoes"}
    </button>
  );

  return (
    <AdminShell title="Identidade" headerExtra={saveButton}>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Brand */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Marca</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Nome e descricao que aparecem no site</p>
          </div>
          <div className="p-5 space-y-4">
            <FormField
              label="Nome do site"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
              placeholder="Ex: Medicinal na Web"
            />
            <FormField
              label="Descricao"
              name="siteDescription"
              type="textarea"
              value={settings.siteDescription}
              onChange={handleChange}
              placeholder="Uma breve descricao do seu site..."
            />
          </div>
        </section>

        {/* Visual Identity — Logo + Favicon side by side */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Identidade Visual</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Logo e favicon do seu site</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo */}
              <div>
                <label className="block text-[12px] font-semibold text-foreground mb-2">Logo</label>
                <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-center min-h-[120px]">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="max-h-[80px] max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhuma logo</span>
                  )}
                </div>
                <div className="mt-2">
                  <ImageUpload
                    value={settings.logoId}
                    previewUrl={logoPreview}
                    onChange={(id, url) => onLogoChange(id, url)}
                  />
                </div>
              </div>

              {/* Favicon */}
              <div>
                <label className="block text-[12px] font-semibold text-foreground mb-2">Favicon</label>
                <div className="rounded-lg border border-border bg-background p-4 flex items-center justify-center min-h-[120px]">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="max-h-[48px] max-w-[48px] object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Nenhum favicon</span>
                  )}
                </div>
                <div className="mt-2">
                  <ImageUpload
                    value={settings.faviconId}
                    previewUrl={faviconPreview}
                    onChange={(id, url) => onFaviconChange(id, url)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Frontend URL */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">URL do Frontend</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">URL onde o site e renderizado — usada no preview e webhooks</p>
          </div>
          <div className="p-5">
            <FormField
              label="Frontend URL"
              name="frontendUrl"
              value={frontendUrl}
              onChange={(e) => setFrontendUrl(e.target.value)}
              placeholder="https://meusite.vercel.app"
              description="Sem barra final. Ex: https://blog-medicinal.vercel.app"
            />
            {tenant?.frontendUrl && (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-muted-foreground">
                  Conectado: <a href={tenant.frontendUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{tenant.frontendUrl}</a>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* SEO Preview */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Preview</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Como o site aparece no Google e redes sociais</p>
          </div>
          <div className="p-5">
            {/* Google preview */}
            <div className="rounded-md border border-border bg-background p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Google</p>
              <p className="text-[14px] font-medium text-[#1a0dab] leading-tight truncate">
                {settings.seoTitle || settings.siteName || "Titulo do site"}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700 font-mono truncate">
                {frontendUrl || "https://meusite.com"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {settings.seoDescription || settings.siteDescription || "Descricao do site..."}
              </p>
            </div>
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
