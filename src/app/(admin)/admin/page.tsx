"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@brasa/admin";

/* ── Types ────────────────────────────────────────────────────────────────────── */

type Performance = {
  current: {
    totalRequests: number;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
  };
  previous: {
    totalRequests: number;
    avgLatency: number;
    errorRate: number;
  };
  slowestPages: {
    path: string;
    avgLatency: number;
    p95Latency: number;
    count: number;
  }[];
};

type RecentChange = {
  type: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
  created_at: string;
};

type Release = {
  title: string;
  slug: string;
  published_at: string;
  views: number;
};

type DashboardData = {
  performance: Performance;
  recentChanges: RecentChange[];
  releases: Release[];
};

/* ── Helpers ──────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

function delta(current: number, previous: number): { label: string; positive: boolean } | null {
  if (!previous || !current || !isFinite(current) || !isFinite(previous)) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!isFinite(pct) || Math.abs(pct) < 0.5) return null;
  // Cap at +/- 999% to avoid alarming numbers from near-zero baselines
  const capped = Math.max(-999, Math.min(999, pct));
  return { label: `${capped > 0 ? "+" : ""}${capped.toFixed(0)}%`, positive: capped < 0 };
}

function latencyColor(ms: number): string {
  if (ms <= 200) return "text-success";
  if (ms <= 500) return "text-warning";
  return "text-destructive";
}

function latencyBar(ms: number): string {
  if (ms <= 200) return "bg-success-bg0/20";
  if (ms <= 500) return "bg-warning-bg0/20";
  return "bg-danger-bg0/20";
}

function healthLabel(avgMs: number, errorRate: number): { text: string; color: string } {
  if (errorRate > 5) return { text: "Atencao necessaria", color: "text-destructive" };
  if (avgMs > 500) return { text: "Pode melhorar", color: "text-warning" };
  if (avgMs > 200) return { text: "Bom", color: "text-success" };
  return { text: "Excelente", color: "text-success" };
}

/* ── Component ────────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (days: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/dashboard?days=${days}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  return (
    <AdminShell title="Dashboard">
      {/* Period selector */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {[
            { days: 1, label: "24h" },
            { days: 7, label: "7 dias" },
            { days: 30, label: "30 dias" },
          ].map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => setPeriod(opt.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === opt.days
                  ? "bg-card text-primary shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Erro ao carregar dashboard</p>
          <button
            type="button"
            onClick={() => fetchData(period)}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5499]"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* ── Performance Benchmark ─────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Desempenho do Site</h2>
              {data.performance.current.totalRequests > 0 && (() => {
                const h = healthLabel(data.performance.current.avgLatency, data.performance.current.errorRate);
                return (
                  <span className={`rounded-full bg-background px-2.5 py-1 text-xs font-semibold ${h.color}`}>
                    {h.text}
                  </span>
                );
              })()}
            </div>
            <div className="p-5">
              {/* Metricas resumo */}
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[
                  { label: "Visualizacoes", value: formatNumber(data.performance.current.totalRequests), diff: delta(data.performance.current.totalRequests, data.performance.previous.totalRequests), invertColor: false },
                  { label: "Tempo de Resposta", value: `${data.performance.current.avgLatency}ms`, diff: delta(data.performance.current.avgLatency, data.performance.previous.avgLatency), invertColor: true },
                  { label: "P95", value: `${data.performance.current.p95Latency}ms`, diff: null, invertColor: true },
                  { label: "Taxa de Erro", value: `${data.performance.current.errorRate}%`, diff: delta(data.performance.current.errorRate, data.performance.previous.errorRate), invertColor: true },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-background px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-foreground">{item.value}</span>
                      {item.diff && (
                        <span className={`text-[11px] font-medium ${
                          item.invertColor
                            ? item.diff.positive ? "text-success" : "text-destructive"
                            : item.diff.positive ? "text-destructive" : "text-success"
                        }`}>
                          {item.diff.label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pages by response time — only show if any page is above 300ms */}
              {data.performance.slowestPages.some((p) => p.avgLatency > 300) && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Tempo de Resposta por Pagina</p>
                  <div className="space-y-1">
                    {data.performance.slowestPages.filter((p) => p.avgLatency > 200).map((page, i) => {
                      const maxLatency = data.performance.slowestPages[0]?.avgLatency || 1;
                      const pct = (page.avgLatency / maxLatency) * 100;
                      return (
                        <div key={i} className="relative rounded-md py-1.5">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-md ${latencyBar(page.avgLatency)}`}
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative flex items-center justify-between px-3 text-sm">
                            <span className="truncate text-foreground" title={page.path}>
                              {page.path.length > 50 ? page.path.slice(0, 50) + "..." : page.path}
                            </span>
                            <div className="ml-3 flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{page.count} req</span>
                              <span className="text-muted-foreground">p95: {page.p95Latency}ms</span>
                              <span className={`font-semibold ${latencyColor(page.avgLatency)}`}>
                                {page.avgLatency}ms
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.performance.current.totalRequests === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem dados de performance no periodo</p>
              )}
            </div>
          </section>

          {/* ── Recent Changes ────────────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Recent Changes</h2>
            </div>
            <div className="divide-y divide-border">
              {data.recentChanges.length > 0 ? (
                data.recentChanges.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      item.type === "post"
                        ? "bg-primary/5 text-primary"
                        : "bg-purple-50 text-purple-600"
                    }`}>
                      {item.type === "post" ? "Post" : "Produto"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">/{item.slug}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "published"
                        ? "bg-success-bg text-success"
                        : "bg-accent text-muted-foreground"
                    }`}>
                      {item.status === "published" ? "publicado" : "rascunho"}
                    </span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground" title={item.updated_at}>
                      {timeAgo(item.updated_at)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhuma alteracao recente</p>
              )}
            </div>
          </section>

          {/* ── Releases & Impact ─────────────────────────────────────────── */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Releases & Impact</h2>
            </div>
            <div className="divide-y divide-border">
              {data.releases.length > 0 ? (
                data.releases.map((item, i) => {
                  const maxViews = Math.max(...data.releases.map((r) => r.views), 1);
                  const pct = (item.views / maxViews) * 100;
                  return (
                    <div key={i} className="relative px-5 py-3">
                      <div
                        className="absolute inset-y-0 right-0 rounded-r-xl bg-primary/[0.03]"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="relative flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Publicado {timeAgo(item.published_at)}
                          </p>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {formatNumber(item.views)}
                          </span>
                          <span className="text-xs text-muted-foreground">views</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">Nenhum post publicado ainda</p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}
