"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@brasa/admin";

/* ── Types ────────────────────────────────────────────────────────────────────── */

type Overview = {
  totalRequests: number;
  avgLatency: number;
  p95Latency: number;
  totalErrors: number;
  totalBandwidth: number;
};

type PathItem = {
  path: string;
  count: number;
  avgLatency: number;
};

type CountryItem = {
  country: string | null;
  count: number;
};

type TimelinePoint = {
  date: string;
  requests: number;
  avgLatency: number;
  errors: number;
};

type StatusItem = {
  statusGroup: string;
  count: number;
};

type MetricsData = {
  overview: Overview;
  topPaths: PathItem[];
  topCountries: CountryItem[];
  timeline: TimelinePoint[];
  statusBreakdown: StatusItem[];
};

/* ── Helpers ──────────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
  AR: "Argentina",
  DE: "Alemanha",
  FR: "Franca",
  ES: "Espanha",
  GB: "Reino Unido",
  MX: "Mexico",
  CO: "Colombia",
  CL: "Chile",
  UY: "Uruguai",
  PY: "Paraguai",
  JP: "Japao",
  CN: "China",
  IN: "India",
  CA: "Canada",
  IT: "Italia",
  NL: "Holanda",
  AU: "Australia",
};

/* ── Icons (SVG inline) ──────────────────────────────────────────────────────── */

const ICONS = {
  requests: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0V156.69l56-56a8,8,0,0,1,11.31,0L148,141.37,207.31,82a8,8,0,0,1,11.32,11.31l-64,64a8,8,0,0,1-11.32,0L103,116.69,48,171.31V200H224A8,8,0,0,1,232,208Z" />
    </svg>
  ),
  latency: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z" />
    </svg>
  ),
  errors: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z" />
    </svg>
  ),
  bandwidth: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M176,152H80a8,8,0,0,0-8,8v32a8,8,0,0,0,8,8h96a8,8,0,0,0,8-8V160A8,8,0,0,0,176,152Zm-8,32H88V168h80Zm40-128H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H208a8,8,0,0,1,8,8Z" />
    </svg>
  ),
  p95: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2" />
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-93.66a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32-11.32L154.34,128H88a8,8,0,0,1,0-16h66.34L130.34,90.34a8,8,0,0,1,11.32-11.32Z" />
    </svg>
  ),
};

/* ── Skeleton ─────────────────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="mb-2 h-4 w-20 rounded bg-accent" />
      <div className="h-8 w-16 rounded bg-accent" />
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchMetrics = useCallback(async (days: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/metrics?days=${days}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(period);
  }, [period, fetchMetrics]);

  const maxRequests = data
    ? Math.max(...data.timeline.map((p) => p.requests), 1)
    : 1;

  return (
    <AdminShell title="Analytics">
      {/* Period selector */}
      <div className="mb-6 flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {[
            { days: 1, label: "24h" },
            { days: 7, label: "7 dias" },
            { days: 30, label: "30 dias" },
            { days: 90, label: "90 dias" },
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
          <p className="text-sm font-medium text-muted-foreground">
            Erro ao carregar metricas
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifique se a tabela request_metrics existe no banco.
          </p>
          <button
            type="button"
            onClick={() => fetchMetrics(period)}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              {
                label: "Total Requests",
                value: formatNumber(data.overview.totalRequests),
                icon: ICONS.requests,
              },
              {
                label: "Avg Latency",
                value: `${data.overview.avgLatency}ms`,
                icon: ICONS.latency,
              },
              {
                label: "P95 Latency",
                value: `${data.overview.p95Latency}ms`,
                icon: ICONS.p95,
              },
              {
                label: "5xx Errors",
                value: formatNumber(data.overview.totalErrors),
                icon: ICONS.errors,
              },
              {
                label: "Bandwidth",
                value: formatBytes(Number(data.overview.totalBandwidth)),
                icon: ICONS.bandwidth,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {card.label}
                  </p>
                  <span className="text-muted-foreground">{card.icon}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Timeline chart */}
          {data.timeline.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Requests por Dia
              </h3>
              <div className="flex h-48 items-end gap-[2px]">
                {data.timeline.map((point, i) => {
                  const pct = (point.requests / maxRequests) * 100;
                  return (
                    <div
                      key={i}
                      className="group relative flex-1"
                      title={`${point.date}: ${point.requests} requests`}
                    >
                      <div
                        className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-white shadow group-hover:block">
                        <span className="font-medium">
                          {point.requests.toLocaleString("pt-BR")} req
                        </span>
                        <br />
                        <span className="text-muted-foreground">
                          {point.avgLatency}ms avg
                        </span>
                        {point.errors > 0 && (
                          <>
                            <br />
                            <span className="text-destructive/50">
                              {point.errors} erros
                            </span>
                          </>
                        )}
                        <br />
                        <span className="text-muted-foreground">{point.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{data.timeline[0]?.date ?? ""}</span>
                <span>
                  {data.timeline[data.timeline.length - 1]?.date ?? ""}
                </span>
              </div>
            </div>
          )}

          {/* Tables: Top URLs + Top Countries + Status Codes */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Top URLs */}
            {data.topPaths.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 lg:col-span-1">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Top URLs
                </h3>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Path</th>
                        <th className="pb-2 text-right font-medium">Req</th>
                        <th className="pb-2 text-right font-medium">Avg ms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPaths.map((item, i) => {
                        const maxCount = data.topPaths[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <tr key={i} className="relative border-b border-border">
                            <td className="relative py-2 pr-2">
                              <div
                                className="absolute inset-y-0 left-0 rounded bg-primary/5"
                                style={{ width: `${pct}%` }}
                              />
                              <span className="relative truncate text-foreground" title={item.path}>
                                {item.path.length > 30
                                  ? item.path.slice(0, 30) + "..."
                                  : item.path}
                              </span>
                            </td>
                            <td className="py-2 text-right font-medium text-foreground">
                              {item.count.toLocaleString("pt-BR")}
                            </td>
                            <td className="py-2 text-right text-muted-foreground">
                              {item.avgLatency}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Countries */}
            {data.topCountries.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Top Paises
                </h3>
                <ul className="space-y-2">
                  {data.topCountries.map((item, i) => {
                    const maxCount = data.topCountries[0]?.count || 1;
                    const pct = (item.count / maxCount) * 100;
                    const code = item.country || "??";
                    const name = COUNTRY_NAMES[code] || code;
                    return (
                      <li key={i} className="relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-primary/5"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between px-2 py-1.5">
                          <span className="text-sm text-foreground">
                            <span className="mr-2 font-mono text-xs text-muted-foreground">
                              {code}
                            </span>
                            {name}
                          </span>
                          <span className="ml-2 text-sm font-medium text-foreground">
                            {item.count.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Status Codes */}
            {data.statusBreakdown.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Status Codes
                </h3>
                <ul className="space-y-2">
                  {data.statusBreakdown.map((item, i) => {
                    const maxCount = Math.max(
                      ...data.statusBreakdown.map((s) => s.count),
                      1,
                    );
                    const pct = (item.count / maxCount) * 100;
                    const color =
                      item.statusGroup.startsWith("2")
                        ? "bg-success-bg0/10"
                        : item.statusGroup.startsWith("3")
                          ? "bg-primary/50/10"
                          : item.statusGroup.startsWith("4")
                            ? "bg-warning-bg0/10"
                            : "bg-danger-bg0/10";
                    return (
                      <li key={i} className="relative">
                        <div
                          className={`absolute inset-y-0 left-0 rounded ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between px-2 py-1.5">
                          <span className="text-sm font-mono text-foreground">
                            {item.statusGroup}
                          </span>
                          <span className="ml-2 text-sm font-medium text-foreground">
                            {item.count.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Empty state */}
          {data.overview.totalRequests === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <span className="mx-auto mb-3 block text-muted-foreground">
                {ICONS.requests}
              </span>
              <p className="text-sm font-medium text-muted-foreground">
                Sem dados de metricas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Os dados aparecerao aqui conforme o site receber trafego.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
