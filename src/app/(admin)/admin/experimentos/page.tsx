"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader, StatusBadge } from "@brasa/admin";

type ExperimentResult = {
  variantId: number;
  impressions: number;
  conversions: number;
  recordedAt: string;
};

type Variant = {
  id: number;
  name: string;
  value: unknown;
  weight: number;
};

type Experiment = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  status: "draft" | "running" | "paused" | "completed";
  goal: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  flag: { id: number; key: string; enabled: boolean; variants: Variant[] } | null;
  results: ExperimentResult[];
};

function conversionRate(impressions: number, conversions: number): string {
  if (impressions === 0) return "0%";
  return ((conversions / impressions) * 100).toFixed(1) + "%";
}

function aggregateResults(results: ExperimentResult[], variants: Variant[]) {
  const map = new Map<number, { impressions: number; conversions: number }>();
  for (const r of results) {
    const existing = map.get(r.variantId) || { impressions: 0, conversions: 0 };
    existing.impressions += r.impressions;
    existing.conversions += r.conversions;
    map.set(r.variantId, existing);
  }
  return variants.map((v) => ({
    ...v,
    ...(map.get(v.id) || { impressions: 0, conversions: 0 }),
  }));
}

const STATUS_MAP: Record<string, "draft" | "published"> = {
  draft: "draft",
  running: "published",
  paused: "draft",
  completed: "published",
};

export default function ExperimentosPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("section");
  const [goal, setGoal] = useState("conversion");

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/admin/experiments")
      .then((r) => r.json())
      .then(setExperiments)
      .catch(() => toast.error("Erro ao carregar"))
      .finally(() => setLoading(false));
  }

  async function handleAdd() {
    if (!name.trim()) return toast.error("Nome e obrigatorio");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, type, goal }),
      });
      if (!res.ok) throw new Error();
      const row = await res.json();
      setExperiments((prev) => [row, ...prev]);
      setName("");
      setDescription("");
      setShowForm(false);
      toast.success("Experimento criado");
    } catch {
      toast.error("Erro ao criar");
    } finally {
      setAdding(false);
    }
  }

  return (
    <AdminShell title="Experimentos">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">A/B Tests</h1>
            <p className="text-sm text-muted-foreground">
              Teste variantes de paginas, sections, imagens e textos.
            </p>
          </div>
          <button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 h-8 text-[12px] font-medium hover:brightness-[0.97]">
            {showForm ? "Cancelar" : "+ Novo Experimento"}
          </button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hero Banner v2" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="section">Section</option>
                  <option value="page">Pagina</option>
                  <option value="image">Imagem</option>
                  <option value="message">Texto</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Descricao</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Testar novo hero com CTA verde" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Objetivo</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                <option value="conversion">Conversao</option>
                <option value="click">Click</option>
                <option value="pageview">Pageview</option>
                <option value="bounce_rate">Bounce Rate</option>
              </select>
            </div>
            <button type="button" onClick={handleAdd} disabled={adding} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-4 h-8 text-[13px] font-medium hover:brightness-[0.97] disabled:opacity-50">
              {adding ? <BrasaLoader size="sm" /> : null}
              {adding ? "Criando..." : "Criar Experimento"}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : experiments.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhum experimento criado.</div>
          ) : (
            experiments.map((exp) => {
              const variants = exp.flag?.variants || [];
              const agg = aggregateResults(exp.results || [], variants);
              const totalImpressions = agg.reduce((s, v) => s + v.impressions, 0);

              return (
                <div key={exp.id} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{exp.name}</span>
                        <StatusBadge status={STATUS_MAP[exp.status] || "draft"} />
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{exp.type}</span>
                      </div>
                      {exp.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{exp.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{totalImpressions.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">impressoes</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted-foreground transition-transform ${expandedId === exp.id ? "rotate-180" : ""}`} aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {expandedId === exp.id && (
                    <div className="border-t border-border px-4 py-3 space-y-3">
                      {exp.flag && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Flag: {exp.flag.key} {exp.flag.enabled ? "(ativa)" : "(inativa)"}
                        </p>
                      )}

                      {/* Results table */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="text-left py-1">Variante</th>
                            <th className="text-right py-1">Peso</th>
                            <th className="text-right py-1">Impressoes</th>
                            <th className="text-right py-1">Conversoes</th>
                            <th className="text-right py-1">Taxa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agg.map((v) => (
                            <tr key={v.id} className="border-t border-border">
                              <td className="py-2 font-medium text-foreground">{v.name}</td>
                              <td className="py-2 text-right text-muted-foreground">{v.weight}%</td>
                              <td className="py-2 text-right tabular-nums">{v.impressions.toLocaleString()}</td>
                              <td className="py-2 text-right tabular-nums">{v.conversions.toLocaleString()}</td>
                              <td className="py-2 text-right font-medium tabular-nums">
                                {conversionRate(v.impressions, v.conversions)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {totalImpressions === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Sem dados ainda. Ative o experimento e aguarde trafego.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AdminShell>
  );
}
