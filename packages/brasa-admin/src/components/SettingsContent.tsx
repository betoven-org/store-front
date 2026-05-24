"use client";

import FormField from "./FormField";
import ImageUpload from "./ImageUpload";
import AssinaturaSection from "./AssinaturaSection";
import DeleteConfirm from "./DeleteConfirm";
import type { SectionKey } from "./SettingsSidebar";

type MediaRelation = { id: number; url: string } | null;

type Settings = {
  id?: number;
  siteName: string;
  siteDescription: string;
  logoId: number | null;
  faviconId: number | null;
  logo?: MediaRelation;
  favicon?: MediaRelation;
  whatsapp: string;
  facebook: string;
  instagram: string;
  youtube: string;
  footerText: string;
  copyrightText: string;
  newsletterTitle: string;
  newsletterDescription: string;
  newsletterConsent: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  privacyPolicy: string;
  robotsTxt: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  supabaseSyncEnabled: boolean;
};

type SettingsContentProps = {
  activeSection: SectionKey;
  settings: Settings;
  logoPreview: string | null;
  faviconPreview: string | null;
  onSettingsChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  onLogoChange: (id: number | null, url: string | null) => void;
  onFaviconChange: (id: number | null, url: string | null) => void;
  syncing: boolean;
  syncProgress: number;
  syncLabel: string;
  syncResult: Record<string, unknown> | null;
  syncError: string | null;
  lastSyncAt: string | null;
  clearing: boolean;
  clearSuccess: boolean;
  onSync: () => void;
  onClearContent: () => void;
  showClearConfirm: boolean;
  onShowClearConfirm: (show: boolean) => void;
};

const SvgSpinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const SvgSync = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M197.67,186.37a8,8,0,0,1,0,11.29C196.58,198.73,170.82,224,128,224c-37.39,0-64.53-22.4-80-39.85V208a8,8,0,0,1-16,0V160a8,8,0,0,1,8-8H88a8,8,0,0,1,0,16H55.44C67.76,183.35,93,208,128,208c36,0,58.14-21.46,58.36-21.68A8,8,0,0,1,197.67,186.37ZM216,40a8,8,0,0,0-8,8V71.85C192.53,54.4,165.39,32,128,32,85.18,32,59.42,57.27,58.34,58.34a8,8,0,0,0,11.3,11.34C69.86,69.46,92,48,128,48c35,0,60.24,24.65,72.56,40H168a8,8,0,0,0,0,16h48a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40Z" />
  </svg>
);

const SvgTrash = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" />
  </svg>
);

const SvgCheck = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

const SvgError = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 256 256"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
  </svg>
);

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsContent({
  activeSection,
  settings,
  logoPreview,
  faviconPreview,
  onSettingsChange,
  onLogoChange,
  onFaviconChange,
  syncing,
  syncProgress,
  syncLabel,
  syncResult,
  syncError,
  lastSyncAt,
  clearing,
  clearSuccess,
  onSync,
  onClearContent,
  showClearConfirm,
  onShowClearConfirm,
}: SettingsContentProps) {
  return (
    <div>
      {activeSection === "identidade" && (
        <div className="space-y-6">
          <SectionHeader
            title="Identidade do Site"
            description="Nome, descricao e imagens do seu site"
          />
          <FormField
            label="Nome do Site"
            name="siteName"
            value={settings.siteName}
            onChange={onSettingsChange}
            placeholder="Ex: Medicinal na Web"
          />
          <FormField
            label="Descricao do Site"
            name="siteDescription"
            type="textarea"
            value={settings.siteDescription}
            onChange={onSettingsChange}
            placeholder="Uma breve descricao do seu site..."
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Logo
            </label>
            <ImageUpload
              value={settings.logoId}
              previewUrl={logoPreview}
              onChange={(id, url) => onLogoChange(id, url)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Favicon
            </label>
            <ImageUpload
              value={settings.faviconId}
              previewUrl={faviconPreview}
              onChange={(id, url) => onFaviconChange(id, url)}
            />
          </div>
        </div>
      )}

      {activeSection === "contato" && (
        <div className="space-y-6">
          <SectionHeader
            title="Contato"
            description="Informacoes de contato exibidas no site"
          />
          <FormField
            label="WhatsApp"
            name="whatsapp"
            value={settings.whatsapp}
            onChange={onSettingsChange}
            placeholder="5531999999999"
            description="Numero com DDI + DDD, sem espacos"
          />
        </div>
      )}

      {activeSection === "redes" && (
        <div className="space-y-6">
          <SectionHeader
            title="Redes Sociais"
            description="Links das redes sociais exibidos no site"
          />
          <FormField
            label="Facebook URL"
            name="facebook"
            value={settings.facebook}
            onChange={onSettingsChange}
            placeholder="https://facebook.com/sua-pagina"
          />
          <FormField
            label="Instagram URL"
            name="instagram"
            value={settings.instagram}
            onChange={onSettingsChange}
            placeholder="https://instagram.com/seu-perfil"
          />
          <FormField
            label="YouTube URL"
            name="youtube"
            value={settings.youtube}
            onChange={onSettingsChange}
            placeholder="https://youtube.com/@seu-canal"
          />
        </div>
      )}

      {activeSection === "footer" && (
        <div className="space-y-6">
          <SectionHeader
            title="Rodape"
            description="Textos exibidos no rodape do site"
          />
          <FormField
            label="Texto do Footer"
            name="footerText"
            type="textarea"
            value={settings.footerText}
            onChange={onSettingsChange}
            placeholder="Texto que aparece no rodape do site..."
          />
          <FormField
            label="Texto de Copyright"
            name="copyrightText"
            value={settings.copyrightText}
            onChange={onSettingsChange}
            placeholder="Ex: 2024 Medicinal na Web. Todos os direitos reservados."
          />
        </div>
      )}

      {activeSection === "newsletter" && (
        <div className="space-y-6">
          <SectionHeader
            title="Newsletter"
            description="Configuracoes do formulario de newsletter"
          />
          <FormField
            label="Titulo"
            name="newsletterTitle"
            value={settings.newsletterTitle}
            onChange={onSettingsChange}
            placeholder="Ex: Receba nossas novidades"
          />
          <FormField
            label="Descricao"
            name="newsletterDescription"
            type="textarea"
            value={settings.newsletterDescription}
            onChange={onSettingsChange}
            placeholder="Texto que aparece acima do formulario de inscricao..."
          />
          <FormField
            label="Texto de Consentimento"
            name="newsletterConsent"
            type="textarea"
            value={settings.newsletterConsent}
            onChange={onSettingsChange}
            placeholder="Ex: Ao se inscrever, voce concorda com nossa politica de privacidade."
          />
        </div>
      )}

      {activeSection === "paginas" && (
        <div className="space-y-6">
          <SectionHeader
            title="Paginas Estaticas"
            description="Conteudo de paginas gerenciadas pelo CMS"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Politica de Privacidade
            </label>
            <p className="mb-3 text-xs text-muted-foreground">
              Cole o conteudo HTML da sua politica de privacidade. Ele sera exibido na pagina /politica-de-privacidade.
            </p>
            <textarea
              name="privacyPolicy"
              value={settings.privacyPolicy}
              onChange={onSettingsChange}
              rows={20}
              placeholder="<h2>Politica de Privacidade</h2><p>Seu conteudo aqui...</p>"
              className="w-full rounded-md border bg-card px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            {settings.privacyPolicy && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                  Preview do conteudo
                </summary>
                <div
                  className="prose prose-sm mt-2 max-w-none rounded-md border bg-card p-4"
                  dangerouslySetInnerHTML={{ __html: settings.privacyPolicy }}
                />
              </details>
            )}
          </div>
        </div>
      )}

      {activeSection === "metatags" && (
        <div className="space-y-6">
          <SectionHeader
            title="Meta Tags"
            description="Tags de SEO para motores de busca"
          />
          <FormField
            label="Titulo SEO"
            name="seoTitle"
            value={settings.seoTitle}
            onChange={onSettingsChange}
            placeholder="Titulo que aparece nos motores de busca"
          />
          <FormField
            label="Descricao SEO"
            name="seoDescription"
            type="textarea"
            value={settings.seoDescription}
            onChange={onSettingsChange}
            placeholder="Meta description para motores de busca..."
          />
          <FormField
            label="Palavras-chave"
            name="seoKeywords"
            value={settings.seoKeywords}
            onChange={onSettingsChange}
            placeholder="saude, plantas medicinais, suplementos, nutricao"
            description="Separe por virgula"
          />
        </div>
      )}

      {activeSection === "robots" && (
        <div className="space-y-6">
          <SectionHeader
            title="Robots.txt"
            description="Conteudo do arquivo robots.txt que sera servido em /robots.txt"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Conteudo do robots.txt
            </label>
            <textarea
              name="robotsTxt"
              value={settings.robotsTxt}
              onChange={onSettingsChange}
              rows={12}
              placeholder={"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: https://seusite.com/sitemap.xml"}
              className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
            <p className="text-xs text-muted-foreground">
              Use o formato padrao de robots.txt. O Sitemap sera adicionado automaticamente se nao estiver presente.
            </p>
          </div>
        </div>
      )}

      {activeSection === "supabase" && (
        <div className="space-y-6">
          <SectionHeader
            title="Supabase"
            description="Conexao com o Supabase para sincronizacao de conteudo"
          />

          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Configure a conexao com o Supabase do cliente para sincronizar conteudo
              (posts, autores e categorias). O Supabase e a fonte de verdade para conteudo
              -- nosso banco armazena uma copia sincronizada.
            </p>
          </div>

          <FormField
            label="URL do Supabase"
            name="supabaseUrl"
            value={settings.supabaseUrl}
            onChange={onSettingsChange}
            placeholder="https://xyzcompany.supabase.co"
          />
          <FormField
            label="Anon Key"
            name="supabaseAnonKey"
            type="password"
            value={settings.supabaseAnonKey}
            onChange={onSettingsChange}
            placeholder="eyJhbGciOi..."
          />
          <FormField
            label="Service Role Key"
            name="supabaseServiceRoleKey"
            type="password"
            value={settings.supabaseServiceRoleKey}
            onChange={onSettingsChange}
            placeholder="eyJhbGciOi..."
            description="Necessario para sincronizacao completa"
          />
          <FormField
            label="Sincronizacao ativa"
            name="supabaseSyncEnabled"
            type="checkbox"
            value={settings.supabaseSyncEnabled}
            onChange={onSettingsChange}
            description="Quando ativo, webhooks do Supabase serao processados automaticamente."
          />

          <div className="border-t border-border pt-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Acoes de Sincronizacao
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onSync}
                disabled={
                  syncing ||
                  !settings.supabaseUrl ||
                  !settings.supabaseServiceRoleKey
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              >
                {syncing ? <SvgSpinner /> : <SvgSync />}
                {syncing ? "Sincronizando..." : "Sincronizar agora"}
              </button>

              <button
                type="button"
                onClick={() => onShowClearConfirm(true)}
                disabled={clearing}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/20 bg-card text-destructive text-[13px] font-medium h-8 px-3 transition-all hover:bg-danger-bg focus-visible:ring-2 focus-visible:ring-destructive/20 disabled:pointer-events-none disabled:opacity-50"
              >
                {clearing ? <SvgSpinner /> : <SvgTrash />}
                {clearing ? "Limpando..." : "Limpar dados de conteudo"}
              </button>
            </div>

            {syncing && (
              <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{syncLabel}</span>
                  <span className="text-xs font-semibold text-primary">
                    {syncProgress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-accent">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {syncResult && !syncing && (
              <div className="mt-4 rounded-md border border-success/20 bg-success-bg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <SvgCheck />
                  Sincronizacao concluida
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-success sm:grid-cols-4">
                  {Object.entries(syncResult).map(([key, val]) => (
                    <div key={key} className="rounded-md bg-card/60 px-3 py-2">
                      <p className="text-xs text-success capitalize">{key}</p>
                      <p className="font-semibold">
                        {typeof val === "object" && val !== null
                          ? `${(val as Record<string, number>).created || 0} novos, ${(val as Record<string, number>).updated || 0} atualizados`
                          : String(val)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syncError && (
              <div className="mt-4 rounded-md border border-destructive/20 bg-danger-bg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <SvgError />
                  {syncError}
                </div>
              </div>
            )}

            {clearSuccess && (
              <div className="mt-4 rounded-md border border-success/20 bg-success-bg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <SvgCheck />
                  Todos os dados de conteudo foram limpos com sucesso.
                </div>
              </div>
            )}

            {lastSyncAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Ultima sincronizacao: {lastSyncAt}
              </p>
            )}
          </div>

          <DeleteConfirm
            open={showClearConfirm}
            onClose={() => onShowClearConfirm(false)}
            onConfirm={onClearContent}
            title="Limpar dados de conteudo?"
            description="Isso ira apagar todos os posts, autores e categorias do banco. Os dados serao re-sincronizados do Supabase na proxima sincronizacao."
          />
        </div>
      )}

      {activeSection === "assinatura" && <AssinaturaSection />}
    </div>
  );
}
