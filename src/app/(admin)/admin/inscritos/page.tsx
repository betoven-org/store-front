"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AdminShell, DataTable , BrasaPageLoader , BrasaLoader } from "@brasa/admin";

type Subscriber = {
  id: number;
  name: string | null;
  email: string;
  active: boolean;
  createdAt: string;
};

type ApiResponse = {
  docs: Subscriber[];
  totalDocs: number;
  totalPages: number;
};

export default function InscritosPage() {
  const [data, setData] = useState<Subscriber[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSubscribers = useCallback(async (page = 1, query = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (query) params.set("search", query);
      const res = await fetch(`/api/admin/subscribers?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar inscritos.");
      const json: ApiResponse = await res.json();
      setData(json.docs);
      setTotalPages(json.totalPages);
      setTotalDocs(json.totalDocs);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSubscribers(1, value);
    }, 400);
  };

  const handleToggleActive = async (subscriber: Subscriber) => {
    setTogglingId(subscriber.id);
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subscriber.id, active: !subscriber.active }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status.");
      setData((prev) =>
        prev.map((s) =>
          s.id === subscriber.id ? { ...s, active: !s.active } : s
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const columns = [
    { key: "name", label: "Nome", render: (item: Subscriber) => (
      <span className="text-foreground">{item.name || "-"}</span>
    )},
    { key: "email", label: "Email" },
    {
      key: "active",
      label: "Status",
      render: (item: Subscriber) => (
        <button
          type="button"
          onClick={() => handleToggleActive(item)}
          disabled={togglingId === item.id}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            item.active
              ? "bg-success-bg text-success hover:bg-success-bg"
              : "bg-accent text-muted-foreground hover:bg-accent"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {togglingId === item.id ? (
            <BrasaLoader size="sm" />
          ) : (
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                item.active ? "bg-success-bg0" : "bg-muted-foreground"
              }`}
              aria-hidden="true"
            />
          )}
          {item.active ? "Ativo" : "Inativo"}
        </button>
      ),
    },
    {
      key: "createdAt",
      label: "Data de Inscricao",
      render: (item: Subscriber) => (
        <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
      ),
    },
  ];

  return (
    <AdminShell title="Inscritos">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Gerencie os inscritos da newsletter.
          </p>
          {!loading && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {totalDocs} total
            </span>
          )}
        </div>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nome ou email..."
            aria-label="Buscar por nome ou email"
            className="w-full rounded-md border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground shadow transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-72"
          />
        </div>
      </div>

      {loading ? (
        <BrasaPageLoader />
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-danger-bg p-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          totalPages={totalPages}
          currentPage={currentPage}
          baseUrl={`/admin/inscritos${search ? `?search=${encodeURIComponent(search)}` : ""}`}
        />
      )}
    </AdminShell>
  );
}
