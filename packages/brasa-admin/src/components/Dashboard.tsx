"use client";

import { useEffect, useState, useCallback } from "react";

type CmsStats = {
  posts: number;
  published: number;
  drafts: number;
  categories: number;
  subscribers: number;
  media: number;
};

type RankedItem = { key: string; value: number };
type TimeseriesPoint = { key: string; total: number; devices: number };
type AnalyticsData = {
  timeseries: TimeseriesPoint[];
  overview: { total: number; devices: number; bounceRate: number };
  pages: RankedItem[];
  referrers: RankedItem[];
  countries: RankedItem[];
  deviceTypes: RankedItem[];
  osList: RankedItem[];
  browsers: RankedItem[];
};

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}

const card: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #f3f4f6",
  borderRadius: 8,
  padding: "14px 18px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9ca3af",
  margin: "0 0 12px",
};

const metricLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const metricValue: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  color: "#111827",
  lineHeight: 1,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};

function RankedList({ title, items, max = 8 }: { title: string; items: RankedItem[]; max?: number }) {
  const top = items.slice(0, max);
  const highest = top[0]?.value || 1;
  if (top.length === 0) return null;
  return (
    <div style={card}>
      <h3 style={{ ...sectionTitle, margin: "0 0 10px" }}>{title}</h3>
      {top.map((item, i) => (
        <div key={i} style={{ marginBottom: i < top.length - 1 ? 6 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <span style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%" }} title={item.key}>
              {item.key || "(direto)"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontVariantNumeric: "tabular-nums" }}>
              {fmt(item.value)}
            </span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "#e5e7eb", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(item.value / highest) * 100}%`, background: "var(--primary)", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniChart({ data }: { data: TimeseriesPoint[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div style={{ ...card, padding: "14px 18px 10px" }}>
      <h3 style={{ ...sectionTitle, margin: "0 0 10px" }}>Page Views por dia</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.key?.split("T")[0] ?? ""}: ${d.total} views`}
            style={{ flex: 1, minWidth: 0, background: "var(--primary)", borderRadius: "2px 2px 0 0", height: `${Math.max((d.total / max) * 100, 2)}%`, opacity: 0.75, transition: "height 0.3s" }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{data[0]?.key?.split("T")[0] ?? ""}</span>
        <span style={{ fontSize: 10, color: "#9ca3af" }}>{data[data.length - 1]?.key?.split("T")[0] ?? ""}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [cms, setCms] = useState<CmsStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    Promise.all([
      fetch("/api/posts?limit=0&depth=0").then((r) => r.json()),
      fetch("/api/posts?limit=0&depth=0&where[status][equals]=published").then((r) => r.json()),
      fetch("/api/posts?limit=0&depth=0&where[status][equals]=draft").then((r) => r.json()),
      fetch("/api/categories?limit=0&depth=0").then((r) => r.json()),
      fetch("/api/subscribers?limit=0&depth=0").then((r) => r.json()),
      fetch("/api/media?limit=0&depth=0").then((r) => r.json()),
    ])
      .then(([all, pub, draft, cats, subs, media]) => {
        setCms({
          posts: all.totalDocs ?? 0,
          published: pub.totalDocs ?? 0,
          drafts: draft.totalDocs ?? 0,
          categories: cats.totalDocs ?? 0,
          subscribers: subs.totalDocs ?? 0,
          media: media.totalDocs ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const to = new Date().toISOString();
    const base = `/api/admin/analytics?from=${from}&to=${to}`;
    try {
      const [tsRes, ovRes, ...groupRes] = await Promise.all([
        fetch(`${base}&type=timeseries`).then((r) => r.ok ? r.json() : null),
        fetch(`${base}&type=overview`).then((r) => r.ok ? r.json() : null),
        ...["path", "referrer", "country", "device_type", "os_name", "client_name"].map((g) =>
          fetch(`${base}&groupBy=${g}&limit=15`).then((r) => r.ok ? r.json() : { ranked: [] }).catch(() => ({ ranked: [] }))
        ),
      ]);

      if (!tsRes && !ovRes) {
        setAnalyticsError(true);
        return;
      }

      setAnalytics({
        timeseries: tsRes?.timeseries || [],
        overview: ovRes || { total: 0, devices: 0, bounceRate: 0 },
        pages: groupRes[0]?.ranked || [],
        referrers: groupRes[1]?.ranked || [],
        countries: groupRes[2]?.ranked || [],
        deviceTypes: groupRes[3]?.ranked || [],
        osList: groupRes[4]?.ranked || [],
        browsers: groupRes[5]?.ranked || [],
      });
    } catch {
      setAnalyticsError(true);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const cmsCards = cms
    ? [
        { label: "Posts", value: cms.posts, href: "/admin/collections/posts" },
        { label: "Publicados", value: cms.published, href: "/admin/collections/posts" },
        { label: "Rascunhos", value: cms.drafts, href: "/admin/collections/posts" },
        { label: "Categorias", value: cms.categories, href: "/admin/collections/categories" },
        { label: "Inscritos", value: cms.subscribers, href: "/admin/collections/subscribers" },
        { label: "Arquivos", value: cms.media, href: "/admin/collections/media" },
      ]
    : [];

  return (
    <div>
      {/* -- CMS Stats -- */}
      <div style={{ marginBottom: 28 }}>
        <p style={sectionTitle}>Conteudo</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {cms
            ? cmsCards.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  style={{ ...card, display: "block", textDecoration: "none", transition: "border-color 0.15s, background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f3f4f6"; e.currentTarget.style.background = "#f9fafb"; }}
                >
                  <div style={metricLabel}>{c.label}</div>
                  <div style={metricValue}>{fmt(c.value)}</div>
                </a>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ ...card, height: 72 }} />
              ))}
        </div>
      </div>

      {/* -- Analytics -- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ ...sectionTitle, margin: 0 }}>Analytics</p>
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              style={{
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 5,
                border: "1px solid",
                borderColor: days === p.days ? "var(--primary)" : "var(--border)",
                background: days === p.days ? "var(--primary)" : "transparent",
                color: days === p.days ? "var(--card)" : "#374151",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {analyticsLoading ? (
        <div style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0" }}>Carregando analytics...</div>
      ) : analyticsError || !analytics ? (
        <div style={{ color: "#9ca3af", fontSize: 13, padding: "24px 0", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
          Sem dados de analytics. Verifique VERCEL_API_TOKEN e VERCEL_PROJECT_ID.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={card}>
              <div style={metricLabel}>Page Views</div>
              <div style={metricValue}>{fmt(analytics.overview.total)}</div>
            </div>
            <div style={card}>
              <div style={metricLabel}>Visitantes</div>
              <div style={metricValue}>{fmt(analytics.overview.devices)}</div>
            </div>
            <div style={card}>
              <div style={metricLabel}>Bounce Rate</div>
              <div style={metricValue}>{(analytics.overview.bounceRate * 100).toFixed(0)}%</div>
            </div>
            {analytics.pages[0] && (
              <div style={card}>
                <div style={metricLabel}>Pagina Top</div>
                <div style={{ ...metricValue, fontSize: 15, marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={analytics.pages[0].key}>
                  {analytics.pages[0].key}
                </div>
              </div>
            )}
            {analytics.countries[0] && (
              <div style={card}>
                <div style={metricLabel}>Pais Top</div>
                <div style={{ ...metricValue, fontSize: 15, marginTop: 6 }}>{analytics.countries[0].key}</div>
              </div>
            )}
          </div>

          {/* Chart */}
          {analytics.timeseries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <MiniChart data={analytics.timeseries} />
            </div>
          )}

          {/* Panels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            <RankedList title="Paginas" items={analytics.pages} max={10} />
            <RankedList title="Paises" items={analytics.countries} />
            <RankedList title="Referrers" items={analytics.referrers} />
            <RankedList title="Dispositivos" items={analytics.deviceTypes} />
            <RankedList title="Sistemas Operacionais" items={analytics.osList} />
            <RankedList title="Navegadores" items={analytics.browsers} />
          </div>
        </>
      )}
    </div>
  );
}
