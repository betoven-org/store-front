"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AdminShell, BrasaLoader } from "@brasa/admin";

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
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRedirects();
  }, []);

  function loadRedirects() {
    fetch("/api/admin/redirects")
      .then((res) => res.json())
      .then(setRedirects)
      .catch(() => toast.error("Erro ao carregar redirects"))
      .finally(() => setLoading(false));
  }

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

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/redirects/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao importar");
        if (data.errors?.length) {
          data.errors.slice(0, 5).forEach((err: string) => toast.error(err));
        }
        return;
      }

      toast.success(`${data.imported} importados, ${data.skipped} duplicados ignorados`);
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} linhas com erro`);
      }

      loadRedirects();
    } catch {
      toast.error("Erro ao importar CSV");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleExportCsv() {
    if (redirects.length === 0) return toast.error("Nenhum redirect para exportar");

    const header = "from,to,type";
    const rows = redirects.map((r) => `${r.from},${r.to},${r.type}`);
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redirects.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  return (
    <AdminShell title="Redirects">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Redirecionamentos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie redirecionamentos 301/302 do seu site.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleImportCsv}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 h-8 text-[12px] font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              {importing ? (
                <BrasaLoader size="sm" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              )}
              Importar CSV
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 h-8 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* CSV format hint */}
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">Formato CSV:</span>{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">from,to,type</code>{" "}
            — Ex: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">/old-page,/new-page,301</code>.
            Separadores aceitos: virgula, ponto-e-virgula ou tab. Header opcional.
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

        {/* Counter */}
        {!loading && redirects.length > 0 && (
          <p className="text-xs text-muted-foreground">{redirects.length} redirect{redirects.length !== 1 ? "s" : ""}</p>
        )}

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
