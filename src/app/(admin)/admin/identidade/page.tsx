"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, FormField, ImageUpload, useTenant, useTenantRefetch , BrasaPageLoader } from "@brasa/admin";
import { useSettings } from "@/hooks/useSettings";

const SOCIAL_NETWORKS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/sua-pagina" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/seu-perfil" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@seu-canal" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@seu-perfil" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/seu-perfil" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/sua-empresa" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/seu-perfil" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@seu-perfil" },
] as const;

type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];

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
  const [previewUrl, setPreviewUrl] = useState("");
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantLoaded, setTenantLoaded] = useState(false);
  const [visibleNetworks, setVisibleNetworks] = useState<SocialKey[]>([]);
  const [socialsLoaded, setSocialsLoaded] = useState(false);

  if (tenant && !tenantLoaded) {
    setFrontendUrl(tenant.frontendUrl || "");
    setPreviewUrl(tenant.previewUrl || "");
    setTenantLoaded(true);
  }

  // Init visible networks from settings
  if (!socialsLoaded && !loading) {
    const dbFields: SocialKey[] = ["facebook", "instagram", "youtube"];
    const active = dbFields.filter((k) => {
      const val = settings[k as keyof typeof settings];
      return val && String(val).trim() !== "";
    });
    setVisibleNetworks(active);
    setSocialsLoaded(true);
  }

  const availableToAdd = SOCIAL_NETWORKS.filter((n) => !visibleNetworks.includes(n.key));

  function addNetwork(key: SocialKey) {
    setVisibleNetworks((prev) => [...prev, key]);
  }

  function removeNetwork(key: SocialKey) {
    setVisibleNetworks((prev) => prev.filter((k) => k !== key));
    handleChange({ target: { name: key, value: "" } } as React.ChangeEvent<HTMLInputElement>);
  }

  async function handleSaveAll() {
    await handleSave();
    // Also save frontend URL if changed
    const tenantUpdates: Record<string, string> = {};
    if (tenant && frontendUrl !== (tenant.frontendUrl || "")) {
      tenantUpdates.frontendUrl = frontendUrl;
    }
    if (tenant && previewUrl !== (tenant.previewUrl || "")) {
      tenantUpdates.previewUrl = previewUrl;
    }
    if (Object.keys(tenantUpdates).length > 0) {
      try {
        const res = await fetch("/api/admin/tenant-info", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tenantUpdates),
        });
        if (res.ok) refetchTenant();
      } catch {}
    }
    toast.success("Configurações salvas");
  }

  if (loading) {
    return (
      <AdminShell title="Identidade">
        <BrasaPageLoader />
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
      {saving ? "Salvando..." : "Salvar alterações"}
    </button>
  );

  return (
    <AdminShell title="Identidade" headerExtra={saveButton}>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Brand */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Marca</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Nome e descrição que aparecem no site</p>
          </div>
          <div className="p-5 space-y-4">
            <FormField
              label="Nome do site"
              name="siteName"
              value={settings.siteName}
              onChange={handleChange}
              placeholder="Ex: Minha Loja"
            />
            <FormField
              label="Descrição"
              name="siteDescription"
              type="textarea"
              value={settings.siteDescription}
              onChange={handleChange}
              placeholder="Uma breve descrição do seu site..."
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
              label="Frontend URL (produção)"
              name="frontendUrl"
              value={frontendUrl}
              onChange={(e) => setFrontendUrl(e.target.value)}
              placeholder="https://www.meusite.com.br"
              description="URL publica do site. Usada no sitemap, SEO e links."
            />
            {tenant?.frontendUrl && (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-muted-foreground">
                  Conectado: <a href={tenant.frontendUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{tenant.frontendUrl}</a>
                </span>
              </div>
            )}
            <div className="mt-4">
              <FormField
                label="Preview URL (Vercel/dev)"
                name="previewUrl"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="https://meusite.vercel.app"
                description="URL usada no preview do editor. Pode ser diferente da produção."
              />
            </div>
          </div>
        </section>

        {/* Redes Sociais */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Redes Sociais</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Links das redes sociais exibidos no site</p>
          </div>
          <div className="p-5 space-y-3">
            {visibleNetworks.map((key) => {
              const network = SOCIAL_NETWORKS.find((n) => n.key === key)!;
              return (
                <div key={key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <FormField
                      label={network.label}
                      name={key}
                      value={(settings[key as keyof typeof settings] as string) ?? ""}
                      onChange={handleChange}
                      placeholder={network.placeholder}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNetwork(key)}
                    className="mb-0.5 flex h-[34px] w-[34px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    title={`Remover ${network.label}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </div>
              );
            })}

            {availableToAdd.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableToAdd.map((network) => (
                  <button
                    key={network.key}
                    type="button"
                    onClick={() => addNetwork(network.key)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="M12 5v14"/>
                    </svg>
                    {network.label}
                  </button>
                ))}
              </div>
            )}

            {visibleNetworks.length === 0 && availableToAdd.length > 0 && (
              <p className="text-[12px] text-muted-foreground">Clique em uma rede acima para adicionar.</p>
            )}
          </div>
        </section>

        {/* WhatsApp */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">WhatsApp</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Número exibido nos botões de WhatsApp do site</p>
          </div>
          <div className="p-5">
            <FormField
              label="Número"
              name="whatsapp"
              value={settings.whatsapp ?? ""}
              onChange={handleChange}
              placeholder="5531999999999"
              description="Número com DDI + DDD, sem espaços"
            />
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
                {settings.seoTitle || settings.siteName || "Título do site"}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700 font-mono truncate">
                {frontendUrl || "https://meusite.com"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                {settings.seoDescription || settings.siteDescription || "Descrição do site..."}
              </p>
            </div>
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
