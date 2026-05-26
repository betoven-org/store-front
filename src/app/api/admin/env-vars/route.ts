import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const VERCEL_API = "https://api.vercel.com";

// Allowlist: only these keys can have their values shown
const VISIBLE_KEYS = new Set([
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
]);

// All other keys are masked
function isSensitive(key: string) {
  return !VISIBLE_KEYS.has(key);
}

async function requireAuth(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return !!token;
}

function getVercelHeaders() {
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
    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/env`, { headers: getVercelHeaders() });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

    const data = await res.json();
    const envs = data.envs.map((env: any) => ({
      id: env.id,
      key: env.key,
      value: isSensitive(env.key) ? "••••••••" : env.value,
      target: env.target,
      type: env.type,
      sensitive: isSensitive(env.key),
    }));
    return NextResponse.json({ envs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id, key, value, target } = await req.json();
    if (isSensitive(key)) {
      return NextResponse.json({ error: `${key} e protegida e nao pode ser editada` }, { status: 403 });
    }

    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/env/${id}`, {
      method: "PATCH",
      headers: getVercelHeaders(),
      body: JSON.stringify({ value, target: target || ["production"] }),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { key, value, target } = await req.json();
    if (!key || !value) return NextResponse.json({ error: "key e value obrigatorios" }, { status: 400 });

    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/env`, {
      method: "POST",
      headers: getVercelHeaders(),
      body: JSON.stringify({
        key,
        value,
        target: target || ["production"],
        type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted",
      }),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { id, key } = await req.json();
    if (isSensitive(key)) return NextResponse.json({ error: `${key} e protegida` }, { status: 403 });

    const res = await fetch(`${VERCEL_API}/v9/projects/${getProjectId()}/env/${id}`, {
      method: "DELETE",
      headers: getVercelHeaders(),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
