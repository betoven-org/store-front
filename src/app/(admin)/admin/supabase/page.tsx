"use client";

import { useState } from "react";
import { AdminShell, SettingsContent, BrasaPageLoader } from "@brasa/admin";
import { useSettings } from "@/hooks/useSettings";

export default function SupabasePage() {
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

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLabel, setSyncLabel] = useState("");
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    setSyncProgress(0);
    setSyncLabel("Iniciando...");
    try {
      const res = await fetch("/api/admin/supabase-sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro na sincronizacao.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Stream nao disponivel");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;
          try {
            const event = JSON.parse(match[1]);
            if (event.progress >= 0) setSyncProgress(event.progress);
            if (event.label) setSyncLabel(event.label);
            if (event.step === "done") {
              setSyncResult(event.result);
              setLastSyncAt(new Date().toLocaleString("pt-BR"));
            }
            if (event.step === "error") {
              setSyncError(event.label);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSyncing(false);
    }
  };

  const handleClearContent = async () => {
    setClearing(true);
    setSyncError(null);
    setSyncResult(null);
    setClearSuccess(false);
    try {
      const res = await fetch("/api/admin/supabase-sync", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao limpar dados.");
      setSyncResult(null);
      setLastSyncAt(null);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 5000);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <AdminShell title="Supabase">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Supabase">
      <div className="rounded-lg border border-border bg-card p-6">
        <SettingsContent
          activeSection="supabase"
          settings={settings}
          logoPreview={logoPreview}
          faviconPreview={faviconPreview}
          onSettingsChange={handleChange}
          onLogoChange={onLogoChange}
          onFaviconChange={onFaviconChange}
          syncing={syncing}
          syncProgress={syncProgress}
          syncLabel={syncLabel}
          syncResult={syncResult}
          syncError={syncError}
          lastSyncAt={lastSyncAt}
          clearing={clearing}
          clearSuccess={clearSuccess}
          onSync={handleSync}
          onClearContent={handleClearContent}
          showClearConfirm={showClearConfirm}
          onShowClearConfirm={setShowClearConfirm}
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
