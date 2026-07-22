import { NextRequest, NextResponse } from "next/server";
import { betterAuthInstance } from "@brasa/core/auth";

const VERCEL_API = "https://api.vercel.com";

async function requireAuth(req: NextRequest) {
  try {
    const session = await betterAuthInstance.api.getSession({ headers: req.headers });
    return !!session?.user;
  } catch {
    return false;
  }
}

function getHeaders() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getProjectId() {
  const id = process.env.VERCEL_PROJECT_ID;
  if (!id) throw new Error("VERCEL_PROJECT_ID not configured");
  return id;
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/domains`, { headers: getHeaders() });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    const data = await res.json();
    const domains = data.domains.map((d: any) => ({
      name: d.name,
      verified: d.verified,
      configured: d.configured ?? d.verified,
      redirect: d.redirect,
      redirectStatusCode: d.redirectStatusCode,
    }));
    return NextResponse.json({ domains });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { domain } = await req.json();
    if (!domain) return NextResponse.json({ error: "domain obrigatorio" }, { status: 400 });

    const res = await fetch(`${VERCEL_API}/v10/projects/${getProjectId()}/domains`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name: domain.toLowerCase() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Erro desconhecido" } }));
      return NextResponse.json({ error: err.error?.message || "Erro ao adicionar dominio" }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { domain } = await req.json();
    if (!domain) return NextResponse.json({ error: "domain obrigatorio" }, { status: 400 });

    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/domains/${domain}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
