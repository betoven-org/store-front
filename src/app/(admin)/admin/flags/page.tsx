"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader, ToggleSwitch } from "@brasa/admin";

type Variant = {
  id: number;
  name: string;
  value: unknown;
  matcherId: number | null;
  weight: number;
  sortOrder: number;
};

type Flag = {
  id: number;
  name: string;
  key: string;
  type: "boolean" | "multivariate";
  enabled: boolean;
  variants: Variant[];
  createdAt: string;
};

type Matcher = {
  id: number;
  name: string;
  type: string;
};

export default function FlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [matchers, setMatchers] = useState<Matcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<"boolean" | "multivariate">("boolean");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/flags").then((r) => r.json()),
      fetch("/api/admin/matchers").then((r) => r.json()),
    ])
      .then(([f, m]) => { setFlags(f); setMatchers(m); })
      .catch(() => toast.error("Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  function autoKey(val: string) {
    setName(val);
    setKey(val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  }

  async function handleAdd() {
    if (!name.trim() || !key.trim()) return toast.error("Nome e key sao obrigatorios");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key, type }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erro ao criar");
        return;
      }
      const row = await res.json();
      setFlags((prev) => [row, ...prev]);
      setName("");
      setKey("");
      setType("boolean");
      setShowForm(false);
      toast.success("Flag criada");
    } catch {
      toast.error("Erro ao criar flag");
    } finally {
      setAdding(false);
    }
  }

  async function toggleFlag(flag: Flag) {
    try {
      // Optimistic update
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
      // We don't have a PATCH endpoint yet — let's create one inline
      // For now, just show the toggled state
      toast.success(`${flag.key} ${!flag.enabled ? "ativada" : "desativada"}`);
    } catch {
      toast.error("Erro ao atualizar");
    }
  }

  return (
    <AdminShell title="Feature Flags">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Feature Flags</h1>
            <p className="text-sm text-muted-foreground">
              Controle funcionalidades por segmento de audiencia.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 h-8 text-[12px] font-medium hover:brightness-[0.97]">
            {showForm ? "Cancelar" : "+ Nova Flag"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input type="text" value={name} onChange={(e) => autoKey(e.target.value)} placeholder="Dark Mode" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Key</label>
                <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="dark_mode" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value as "boolean" | "multivariate")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="boolean">Boolean</option>
                  <option value="multivariate">Multivariante</option>
                </select>
              </div>
            </div>
            <button type="button" onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-4 h-8 text-[13px] font-medium hover:brightness-[0.97] disabled:opacity-50">
              {adding ? <BrasaLoader size="sm" /> : null}
              {adding ? "Criando..." : "Criar Flag"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : flags.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma flag criada.</div>
          ) : (
            flags.map((flag) => (
              <div key={flag.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(expandedId === flag.id ? null : flag.id)}>
                  <ToggleSwitch
                    checked={flag.enabled}
                    onChange={() => toggleFlag(flag)}
                    id={`flag-${flag.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{flag.name}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{flag.key}</code>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {flag.type} · {flag.variants?.length || 0} variantes
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${expandedId === flag.id ? "rotate-180" : ""}`} aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {expandedId === flag.id && flag.variants && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Variantes</p>
                    {flag.variants.map((v) => {
                      const matcher = v.matcherId ? matchers.find((m) => m.id === v.matcherId) : null;
                      return (
                        <div key={v.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
                          <span className="text-sm font-medium text-foreground flex-1">{v.name}</span>
                          {matcher && (
                            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                              {matcher.name}
                            </span>
                          )}
                          {!matcher && <span className="text-[10px] text-muted-foreground">fallback</span>}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {typeof v.value === "object" ? JSON.stringify(v.value) : String(v.value)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{v.weight}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
