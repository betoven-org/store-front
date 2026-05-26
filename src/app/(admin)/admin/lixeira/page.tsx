"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell , BrasaPageLoader } from "@brasa/admin";

type TrashPage = {
  id: number;
  slug: string;
  title: string;
  deletedAt: string;
};

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function LixeiraPage() {
  const [pages, setPages] = useState<TrashPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  function fetchTrash() {
    setLoading(true);
    fetch("/api/admin/trash")
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar lixeira");
        return res.json();
      })
      .then((data) => setPages(data.docs ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTrash();
  }, []);

  async function handleRestore(id: number) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/trash/${id}`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao restaurar");
      }
      toast.success("Pagina restaurada");
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao restaurar");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePermanentDelete(id: number, title: string) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente "${title}"? Essa acao nao pode ser desfeita.`
    );
    if (!confirmed) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/trash/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao excluir");
      }
      toast.success("Pagina excluida permanentemente");
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Lixeira">
        <BrasaPageLoader />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Lixeira">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-foreground">Lixeira</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Páginas na lixeira serão excluídas permanentemente após 30 dias.
        </p>
      </div>

      <div className="overflow-visible rounded-lg border border-border bg-card">
        {error ? (
          <div className="flex items-center gap-2 p-6 text-sm text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z" />
            </svg>
            {error}
          </div>
        ) : pages.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma pagina na lixeira.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Excluido em</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((page) => (
                <tr key={page.id} className="transition-colors hover:bg-background">
                  <td className="px-4 py-3 font-medium text-foreground">{page.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <code className="rounded bg-accent px-1.5 py-0.5 text-xs">{page.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(page.deletedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === page.id}
                        onClick={() => handleRestore(page.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card text-foreground text-[13px] font-medium h-8 px-3 transition-all hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === page.id}
                        onClick={() => handlePermanentDelete(page.id, page.title)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-[13px] font-medium h-8 px-3 transition-all hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Excluir permanentemente
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
