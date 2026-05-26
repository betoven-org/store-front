"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminShell } from "@brasa/admin";

/* ── Types ──────────────────────────────────────────────────────────────────── */

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
};

type RecentChange = {
  type: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
};

type Release = {
  title: string;
  slug: string;
  published_at: string;
  views: number;
};

type DashboardData = {
  performance: Performance & { slowestPages: unknown[] };
  recentChanges: RecentChange[];
  releases: Release[];
};

type AnalyticsOverview = {
  totalViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  configured?: boolean;
};

type TimeseriesPoint = { date: string; views: number };

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return new Intl.NumberFormat("pt-BR").format(n);
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `ha ${days}d`;
  return `ha ${Math.floor(days / 30)}m`;
}

function pctChange(current: number, previous: number): { label: string; positive: boolean } | null {
  if (!previous || !current) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!isFinite(pct) || Math.abs(pct) < 0.5) return null;
  const capped = Math.max(-999, Math.min(999, pct));
  return { label: `${capped > 0 ? "+" : ""}${capped.toFixed(1)}%`, positive: capped > 0 };
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return WEEKDAY_SHORT[d.getDay()];
}

/* ── Activity icons by type ─────────────────────────────────────────────────── */

function ActivityIcon({ type, status }: { type: string; status: string }) {
  if (status === "published") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (type === "product") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

/* ── SVG Chart (pure, no libs) ──────────────────────────────────────────────── */

function TrafficChart({ data, configured = true }: { data: TimeseriesPoint[]; configured?: boolean }) {
  if (!configured) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Analytics não configurado</span>
        <span className="text-xs">Defina ANALYTICS_TOKEN e ANALYTICS_PROJECT_ID</span>
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem dados de tráfego no período
      </div>
    );
  }

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const W = 700;
  const H = 260;
  const PX = 40;
  const PY = 20;

  const chartW = W - PX - 10;
  const chartH = H - PY * 2;

  const points = data.map((d, i) => ({
    x: PX + (i / (data.length - 1 || 1)) * chartW,
    y: PY + chartH - (d.views / maxViews) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${PY + chartH} L${points[0].x},${PY + chartH} Z`;

  const ticks = 5;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => {
    const val = (maxViews / ticks) * (ticks - i);
    return {
      y: PY + (i / ticks) * chartH,
      label: val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val.toFixed(0)}`,
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {yLabels.map((t, i) => (
        <g key={i}>
          <line x1={PX} y1={t.y} x2={W - 10} y2={t.y} stroke="#f3f4f6" strokeWidth="1" />
          <text x={PX - 6} y={t.y + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            {t.label}
          </text>
        </g>
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181b" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#18181b" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={linePath} fill="none" stroke="#18181b" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#18181b" strokeWidth="2" />
          <text x={p.x} y={H + 10} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            {dayLabel(p.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  subtitle,
  change,
  icon,
}: {
  label: string;
  value: string;
  subtitle?: string;
  change?: { label: string; positive: boolean } | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </p>
      {(change || subtitle) && (
        <div className="mt-1.5 flex items-baseline gap-1.5">
          {change && (
            <span className={`text-xs font-semibold ${change.positive ? "text-emerald-600" : "text-red-500"}`}>
              {change.label}
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Latency Bar ────────────────────────────────────────────────────────────── */

function LatencyBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${value <= 200 ? "bg-foreground" : value <= 500 ? "bg-amber-500" : "bg-red-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [period, setPeriod] = useState(7);
  const [data, setData] = useState<DashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (days: number) => {
    setLoading(true);
    setError(false);

    const from = new Date(Date.now() - days * 86400000).toISOString();
    const to = new Date().toISOString();

    try {
      const [dashRes, overviewRes, tsRes] = await Promise.all([
        fetch(`/api/admin/dashboard?days=${days}`),
        fetch(`/api/admin/analytics?type=overview&from=${from}&to=${to}`).catch(() => null),
        fetch(`/api/admin/analytics?type=timeseries&from=${from}&to=${to}`).catch(() => null),
      ]);

      if (!dashRes.ok) throw new Error();
      setData(await dashRes.json());

      if (overviewRes?.ok) {
        setAnalytics(await overviewRes.json());
      }
      if (tsRes?.ok) {
        setTimeseries(await tsRes.json());
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const postCount = data?.releases?.length ?? 0;
  const productCount = data?.recentChanges?.filter((c) => c.type === "product").length ?? 0;

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
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === opt.days
                  ? "bg-card text-foreground shadow-sm"
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
            className="mt-3 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="h-[380px] animate-pulse rounded-xl border border-border bg-card lg:col-span-3" />
            <div className="h-[380px] animate-pulse rounded-xl border border-border bg-card lg:col-span-2" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Row 1: Stat Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Posts publicados"
              value={String(postCount)}
              subtitle={postCount > 0 ? "no período" : undefined}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
            />
            <StatCard
              label="Produtos"
              value={String(productCount)}
              subtitle={productCount > 0 ? "alterados" : undefined}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              }
            />
            <StatCard
              label={`Pageviews (${period}d)`}
              value={formatNumber(analytics?.totalViews ?? data.performance.current.totalRequests)}
              change={pctChange(
                analytics?.totalViews ?? data.performance.current.totalRequests,
                data.performance.previous.totalRequests,
              )}
              subtitle="vs. período anterior"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            />
            <StatCard
              label="Latência p50"
              value={`${data.performance.current.p50Latency}ms`}
              change={(() => {
                const diff = data.performance.current.avgLatency - data.performance.previous.avgLatency;
                if (!data.performance.previous.avgLatency || Math.abs(diff) < 1) return null;
                return { label: `${diff > 0 ? "+" : ""}${diff}ms`, positive: diff < 0 };
              })()}
              subtitle="API media"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              }
            />
          </div>

          {/* Row 2: Traffic Chart + Activity Feed */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="rounded-xl border border-border bg-card lg:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Tráfego do site</h2>
                  <p className="text-xs text-muted-foreground">
                    Pageviews · {period === 1 ? "24 horas" : `${period} dias`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
                    Pageviews
                  </span>
                </div>
              </div>
              <div className="p-5">
                <TrafficChart data={timeseries} configured={analytics?.configured !== false} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Atividade recente</h2>
                  <p className="text-xs text-muted-foreground">Últimas alterações</p>
                </div>
                {data.recentChanges.length > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-foreground">
                    {data.recentChanges.length}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border">
                {data.recentChanges.length > 0 ? (
                  data.recentChanges.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 flex-shrink-0 text-muted-foreground/60">
                        <ActivityIcon type={item.type} status={item.status} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{item.name}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(item.updated_at)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma atividade recente</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Recent Posts + Performance */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="rounded-xl border border-border bg-card lg:col-span-3">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">Posts recentes</h2>
                <Link
                  href="/admin/posts"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver todos
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {data.releases.length > 0 ? (
                  data.releases.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-medium text-muted-foreground">
                        img
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Publicado {timeAgo(item.published_at)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Publicado
                      </span>
                      <span className="min-w-[50px] text-right text-sm font-semibold text-muted-foreground tabular-nums">
                        {formatNumber(item.views)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum post publicado</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">Performance</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  data.performance.current.errorRate > 5
                    ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    data.performance.current.errorRate > 5 ? "bg-red-500" : "bg-emerald-500"
                  }`} />
                  {data.performance.current.errorRate > 5 ? "atencao" : "operacional"}
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="mb-4 text-xs text-muted-foreground">
                  API · ultimos {period === 1 ? "24h" : `${period} dias`}
                </p>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-foreground">Latência p50</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {data.performance.current.p50Latency}<span className="text-xs font-normal text-muted-foreground">ms</span>
                      </span>
                    </div>
                    <LatencyBar value={data.performance.current.p50Latency} max={1000} />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-foreground">Latência p95</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {data.performance.current.p95Latency}<span className="text-xs font-normal text-muted-foreground">ms</span>
                      </span>
                    </div>
                    <LatencyBar value={data.performance.current.p95Latency} max={1000} />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-foreground">Latência p99</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {data.performance.current.p99Latency}<span className="text-xs font-normal text-muted-foreground">ms</span>
                      </span>
                    </div>
                    <LatencyBar value={data.performance.current.p99Latency} max={1000} />
                  </div>
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Taxa de erro</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        data.performance.current.errorRate > 5 ? "text-red-500" : "text-foreground"
                      }`}>
                        {data.performance.current.errorRate}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Total requests</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {formatNumber(data.performance.current.totalRequests)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
