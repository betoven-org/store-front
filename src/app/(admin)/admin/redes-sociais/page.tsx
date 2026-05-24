"use client";

import { AdminShell, SettingsContent } from "@brasa/admin";
import { useSettings } from "@/hooks/useSettings";

export default function RedesSociaisPage() {
  const {
    settings,
    loading,
    saving,
    error,
    success,
    logoPreview,
    faviconPreview,
    handleChange,
    handleSave,
    onLogoChange,
    onFaviconChange,
  } = useSettings();

  if (loading) {
    return (
      <AdminShell title="Redes Sociais">
        <div className="flex items-center justify-center py-12">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Redes Sociais">
      <div className="rounded-lg border border-border bg-card p-6">
        <SettingsContent
          activeSection="redes"
          settings={settings}
          logoPreview={logoPreview}
          faviconPreview={faviconPreview}
          onSettingsChange={handleChange}
          onLogoChange={onLogoChange}
          onFaviconChange={onFaviconChange}
          syncing={false}
          syncProgress={0}
          syncLabel=""
          syncResult={null}
          syncError={null}
          lastSyncAt={null}
          clearing={false}
          clearSuccess={false}
          onSync={() => {}}
          onClearContent={() => {}}
          showClearConfirm={false}
          onShowClearConfirm={() => {}}
        />

        <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            {saving ? (
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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 256 256"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z" />
              </svg>
            )}
            {saving ? "Salvando..." : "Salvar"}
          </button>

          {success && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
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
              Salvo com sucesso!
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
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
              {error}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
