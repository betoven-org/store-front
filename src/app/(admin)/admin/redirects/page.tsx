"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AdminShell } from "@brasa/admin";

type Redirect = {
  id: number;
  from: string;
  to: string;
  type: number;
  active: boolean;
  createdAt: string;
};

export default function RedirectsPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState(301);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/admin/redirects")
      .then((res) => res.json())
      .then(setRedirects)
      .catch(() => toast.error("Erro ao carregar redirects"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!from || !to) return toast.error("Preencha origem e destino");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/redirects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, type }),
      });
      if (!res.ok) throw new Error("Erro ao criar");
      const row = await res.json();
      setRedirects((prev) => [row, ...prev]);
      setFrom("");
      setTo("");
      toast.success("Redirect criado");
    } catch {
      toast.error("Erro ao criar redirect");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch("/api/admin/redirects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setRedirects((prev) => prev.filter((r) => r.id !== id));
      toast.success("Removido");
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <AdminShell title="Redirects">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Redirecionamentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie redirecionamentos 301/302 do seu site. O frontend consome via API.
          </p>
        </div>

        {/* Add form */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_auto]">
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="/pagina-antiga"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="/pagina-nova"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <select
              value={type}
              onChange={(e) => setType(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value={301}>301</option>
              <option value={302}>302</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background text-[13px] font-medium h-9 px-4 hover:brightness-[0.97] disabled:opacity-50"
            >
              {adding ? "..." : "Adicionar"}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : redirects.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum redirect cadastrado.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Origem</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Destino</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{r.from}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.to}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
