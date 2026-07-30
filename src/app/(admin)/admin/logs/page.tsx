"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminShell, BrasaPageLoader } from "@brasa/admin";
import { ScrollText, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

type AuditLog = {
  id: number;
  userName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  resourceTitle: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "page.create": "Criou pagina",
  "page.update": "Editou pagina",
  "page.publish": "Publicou pagina",
  "page.delete": "Excluiu pagina",
  "page.status": "Alterou status da pagina",
  "page.duplicate": "Duplicou pagina",
  "page.schedule": "Agendou pagina",
  "page.discard": "Descartou rascunho",
  "post.create": "Criou post",
  "post.update": "Editou post",
  "post.delete": "Excluiu post",
  "product.create": "Criou produto",
  "product.update": "Editou produto",
  "product.delete": "Excluiu produto",
  "collection.create": "Criou collection",
  "collection.update": "Editou collection",
  "collection.delete": "Excluiu collection",
  "collection.toggle": "Ativou/desativou collection",
  "collection.item.create": "Criou item",
  "collection.item.update": "Editou item",
  "collection.item.delete": "Excluiu item",
  "media.upload": "Fez upload de midia",
  "media.delete": "Excluiu midia",
  "settings.update": "Alterou configuracoes",
  "global.update": "Alterou sections globais",
  "user.create": "Criou usuario",
  "user.update": "Editou usuario",
  "auth.login": "Fez login",
  "publish.batch": "Publicou em lote",
  "discard.batch": "Descartou em lote",
};

const RESOURCE_LABELS: Record<string, string> = {
  pages: "Paginas",
  posts: "Posts",
  products: "Produtos",
  collections: "Collections",
  media: "Midias",
  settings: "Configuracoes",
  users: "Usuarios",
  global: "Global",
  auth: "Autenticacao",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-600",
  publish: "bg-blue-500/10 text-blue-600",
  update: "bg-amber-500/10 text-amber-600",
  delete: "bg-red-500/10 text-red-600",
  toggle: "bg-purple-500/10 text-purple-600",
  login: "bg-sky-500/10 text-sky-600",
  batch: "bg-indigo-500/10 text-indigo-600",
  upload: "bg-teal-500/10 text-teal-600",
  status: "bg-orange-500/10 text-orange-600",
  schedule: "bg-cyan-500/10 text-cyan-600",
  discard: "bg-gray-500/10 text-gray-600",
  duplicate: "bg-violet-500/10 text-violet-600",
};

function getActionColor(action: string): string {
  const verb = action.split(".").pop() || "";
  return ACTION_COLORS[verb] || "bg-muted text-muted-foreground";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atras`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h atras`;

  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (resource) params.set("resource", resource);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs(data.docs ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, resource]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  }

  return (
    <AdminShell title="Logs de Atividade">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Registro imutavel de todas as acoes realizadas no CMS.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {total} registro{total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Resource filter */}
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              value={resource}
              onChange={(e) => { setResource(e.target.value); setPage(1); }}
              className="h-8 appearance-none rounded-md border border-border bg-card pl-8 pr-8 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Todos</option>
              {Object.entries(RESOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-8 w-48 rounded-md border border-border bg-card pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </form>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BrasaPageLoader />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ScrollText className="mx-auto mb-4 size-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/40">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quando</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acao</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recurso</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-accent/30 ${expandedId === log.id ? "bg-accent/20" : ""}`}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap" title={new Date(log.createdAt).toLocaleString("pt-BR")}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium text-xs">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getActionColor(log.action)}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {RESOURCE_LABELS[log.resource] || log.resource}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[200px] truncate">
                      {log.resourceTitle || log.resourceId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Pagina {page} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-border bg-card p-1.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
