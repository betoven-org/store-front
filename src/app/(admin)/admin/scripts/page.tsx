"use client";

import { toast } from "sonner";
import { AdminShell, BrasaPageLoader, FormField } from "@brasa/admin";
import { useSettings } from "@/hooks/useSettings";

export default function ScriptsPage() {
  const {
    settings,
    loading,
    saving,
    handleChange,
    handleSave,
  } = useSettings();

  if (loading) {
    return (
      <AdminShell title="Scripts & Analytics">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  async function onSave() {
    await handleSave();
    toast.success("Configurações salvas");
  }

  const saveButton = (
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-[12px] font-medium h-7 px-3 transition-all hover:brightness-[0.97] disabled:opacity-50"
    >
      {saving ? "Salvando..." : "Salvar alterações"}
    </button>
  );

  return (
    <AdminShell title="Scripts & Analytics" headerExtra={saveButton}>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* GTM */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Google Tag Manager</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              O script GTM sera injetado automaticamente no head e body do site
            </p>
          </div>
          <div className="p-5">
            <FormField
              label="GTM Container ID"
              name="gtmId"
              value={settings.gtmId}
              onChange={handleChange}
              placeholder="GTM-XXXXXXX"
            />
          </div>
        </section>

        {/* GA4 + Google Ads */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Google Analytics & Ads</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              IDs de rastreamento Google. Se o GA4 ja estiver configurado no GTM, nao precisa preencher aqui.
            </p>
          </div>
          <div className="p-5 space-y-4">
            <FormField
              label="Google Analytics 4 (GA4)"
              name="ga4Id"
              value={settings.ga4Id}
              onChange={handleChange}
              placeholder="G-XXXXXXXXXX"
            />
            <FormField
              label="Google Ads"
              name="googleAdsId"
              value={settings.googleAdsId}
              onChange={handleChange}
              placeholder="AW-XXXXXXXXXX"
            />
          </div>
        </section>

        {/* Facebook Pixel */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Facebook Pixel</h3>
          </div>
          <div className="p-5">
            <FormField
              label="Pixel ID"
              name="facebookPixelId"
              value={settings.facebookPixelId}
              onChange={handleChange}
              placeholder="123456789012345"
            />
          </div>
        </section>

        {/* Umami */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Umami Analytics</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Analytics open-source auto-hospedado</p>
          </div>
          <div className="p-5 space-y-4">
            <FormField
              label="Website ID"
              name="umamiWebsiteId"
              value={settings.umamiWebsiteId}
              onChange={handleChange}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
            <FormField
              label="URL do Umami"
              name="umamiUrl"
              value={settings.umamiUrl}
              onChange={handleChange}
              placeholder="https://analytics.seusite.com"
            />
          </div>
        </section>

        {/* Custom Scripts */}
        <section className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background px-5 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Scripts Customizados</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              HTML/JS injetado diretamente no site. Use com cuidado.
            </p>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-foreground">
                Scripts no Head
              </label>
              <textarea
                name="customHeadScripts"
                value={settings.customHeadScripts}
                onChange={handleChange}
                rows={6}
                placeholder={'<script>\n  // Seu script aqui\n</script>'}
                aria-label="Scripts no Head"
                className="w-full rounded-md border bg-card px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <p className="text-[11px] text-muted-foreground">
                Inserido antes do fechamento do &lt;head&gt;
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-foreground">
                Scripts no Body
              </label>
              <textarea
                name="customBodyScripts"
                value={settings.customBodyScripts}
                onChange={handleChange}
                rows={6}
                placeholder={'<noscript>\n  <!-- Fallback aqui -->\n</noscript>'}
                aria-label="Scripts no Body"
                className="w-full rounded-md border bg-card px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <p className="text-[11px] text-muted-foreground">
                Inserido logo apos a abertura do &lt;body&gt;
              </p>
            </div>
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
