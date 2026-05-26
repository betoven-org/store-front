import { NextRequest, NextResponse } from "next/server";
import { auth } from "@brasa/core/auth";

const VERCEL_API = "https://vercel.com/api/web-analytics";

const VALID_GROUP_BY = [
  "path", "route", "country", "os_name", "device_type",
  "client_name", "referrer", "utm", "ref", "hostname",
  "event_name", "flags",
];

/**
 * Proxy para Vercel Web Analytics API.
 *
 * Endpoints consumidos pelo dashboard:
 *
 * 1. ?type=overview&from=...&to=...
 *    Retorna: { totalViews, uniqueVisitors, bounceRate, topPage, topCountry }
 *
 * 2. ?type=timeseries&from=...&to=...
 *    Retorna: [{ date, views }, ...]
 *
 * 3. ?groupBy=path|country|referrer&from=...&to=...&limit=N
 *    Retorna: [{ name, count }, ...]
 *
 * Env vars: ANALYTICS_TOKEN ou VERCEL_API_TOKEN, ANALYTICS_PROJECT_ID, ANALYTICS_TEAM_ID (opcional)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const token = process.env.ANALYTICS_TOKEN || process.env.VERCEL_API_TOKEN;
  const projectId = process.env.ANALYTICS_PROJECT_ID;
  const teamId = process.env.ANALYTICS_TEAM_ID;

  if (!token || !projectId) {
    const { searchParams: sp } = new URL(req.url);
    const t = sp.get("type") || "timeseries";
    if (t === "overview") {
      return NextResponse.json({
        totalViews: 0, uniqueVisitors: 0, bounceRate: 0,
        topPage: "--", topCountry: "--", configured: false,
      });
    }
    return NextResponse.json([], { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "timeseries";
  const groupBy = searchParams.get("groupBy") || "";
  const from = searchParams.get("from") || new Date(Date.now() - 7 * 86400000).toISOString();
  const to = searchParams.get("to") || new Date().toISOString();
  const limit = searchParams.get("limit");

  if (groupBy && !VALID_GROUP_BY.includes(groupBy)) {
    return NextResponse.json({ error: "Invalid groupBy" }, { status: 400 });
  }

  const params = new URLSearchParams({ projectId, from, to, environment: "production" });
  if (teamId) params.set("teamId", teamId);
  if (limit) params.set("limit", limit);

  try {
    // Grouped queries use the timeseries endpoint with groupBy
    if (groupBy) {
      params.set("groupBy", groupBy);
      const res = await fetch(`${VERCEL_API}/timeseries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Vercel API ${res.status}: ${text}` }, { status: res.status });
      }

      const raw = await res.json();
      const groups = raw?.data?.groups || {};

      const ranked: { name: string; count: number }[] = Object.entries(groups)
        .filter(([key]) => key !== "")
        .map(([key, points]) => ({
          name: key,
          count: (points as { total?: number }[]).reduce((sum, p) => sum + (p.total || 0), 0),
        }))
        .sort((a, b) => b.count - a.count);

      const maxItems = limit ? parseInt(limit, 10) : ranked.length;
      return NextResponse.json(ranked.slice(0, maxItems));
    }

    // Overview (no groupBy)
    if (type === "overview") {
      // Fetch overview + grouped pages + grouped countries in parallel for the overview card
      const [overviewRes, pagesRes, countriesRes] = await Promise.all([
        fetch(`${VERCEL_API}/overview?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${VERCEL_API}/timeseries?${new URLSearchParams({ ...Object.fromEntries(params), groupBy: "path", limit: "1" })}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${VERCEL_API}/timeseries?${new URLSearchParams({ ...Object.fromEntries(params), groupBy: "country", limit: "1" })}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!overviewRes.ok) {
        const text = await overviewRes.text();
        return NextResponse.json({ error: `Vercel API ${overviewRes.status}: ${text}` }, { status: overviewRes.status });
      }

      const overview = await overviewRes.json();

      // Extract top page
      let topPage = "--";
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        const groups = pagesData?.data?.groups || {};
        const sorted = Object.entries(groups)
          .filter(([k]) => k !== "")
          .map(([k, pts]) => ({
            key: k,
            total: (pts as { total?: number }[]).reduce((s, p) => s + (p.total || 0), 0),
          }))
          .sort((a, b) => b.total - a.total);
        if (sorted[0]) topPage = sorted[0].key;
      }

      // Extract top country
      let topCountry = "--";
      if (countriesRes.ok) {
        const countriesData = await countriesRes.json();
        const groups = countriesData?.data?.groups || {};
        const sorted = Object.entries(groups)
          .filter(([k]) => k !== "")
          .map(([k, pts]) => ({
            key: k,
            total: (pts as { total?: number }[]).reduce((s, p) => s + (p.total || 0), 0),
          }))
          .sort((a, b) => b.total - a.total);
        if (sorted[0]) topCountry = sorted[0].key;
      }

      return NextResponse.json({
        totalViews: overview.pageViews ?? overview.totalViews ?? 0,
        uniqueVisitors: overview.visitors ?? overview.uniqueVisitors ?? 0,
        bounceRate: overview.bounceRate != null
          ? (overview.bounceRate <= 1 ? overview.bounceRate * 100 : overview.bounceRate)
          : 0,
        topPage,
        topCountry,
      });
    }

    // Timeseries (no groupBy)
    const res = await fetch(`${VERCEL_API}/timeseries?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Vercel API ${res.status}: ${text}` }, { status: res.status });
    }

    const raw = await res.json();
    const allPoints = raw?.data?.groups?.all || raw?.data || [];

    const timeseries: { date: string; views: number }[] = (Array.isArray(allPoints) ? allPoints : []).map(
      (p: { key?: string; total?: number }) => ({
        date: p.key ? p.key.split("T")[0] : "",
        views: p.total || 0,
      }),
    );

    return NextResponse.json(timeseries);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
