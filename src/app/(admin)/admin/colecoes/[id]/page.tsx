"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Settings,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { AdminShell, BrasaPageLoader, DeleteConfirm, BulkBar } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type CollectionField = {
  id: number;
  slug: string;
  name: string;
  type: string;
  required: boolean;
  sortOrder: number;
  config: any;
};

type CollectionInfo = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  source: string;
  fields: CollectionField[];
};

type CollectionItem = {
  id: number;
  slug: string;
  data: Record<string, any>;
  status: "draft" | "published";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function CollectionItemsPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<CollectionInfo | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const fetchCollection = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCollection(data);
    } catch {
      toast.error("Erro ao carregar collection");
    }
  }, [collectionId]);

  const fetchItems = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (search) params.set("search", search);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(
          `/api/admin/collections/${collectionId}/items?${params}`,
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setItems(data.docs ?? []);
        setTotal(data.total ?? 0);
        setCurrentPage(page);
      } catch {
        toast.error("Erro ao carregar itens");
      } finally {
        setLoading(false);
        setSelected(new Set());
      }
    },
    [collectionId, search, statusFilter],
  );

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  // Primary column: first text field
  const primaryField = collection?.fields.find((f) => f.type === "text");
  const visibleFields = (collection?.fields ?? []).slice(0, 4);
  const totalPages = Math.ceil(total / limit);

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkAction(action: "publish" | "draft" | "delete") {
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/items/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        action === "delete"
          ? "Itens excluidos"
          : action === "publish"
            ? "Itens publicados"
            : "Itens movidos para rascunho",
      );
      fetchItems(currentPage);
    } catch {
      toast.error("Erro na acao em massa");
    } finally {
      setBulkLoading(false);
      setShowBulkDelete(false);
    }
  }

  function getPrimaryValue(item: CollectionItem): string {
    if (!primaryField) return item.slug;
    const val = item.data?.[primaryField.slug];
    return typeof val === "string" ? val : item.slug;
  }

  return (
    <AdminShell
      title={collection?.name ?? "Collection"}
      headerExtra={
        collection ? (
          <Link
            href={`/admin/colecoes/${collectionId}/configurar`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="size-4" />
            Configurar
          </Link>
        ) : null
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin/colecoes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Collections
        </Link>
      </div>

      {/* Search + Filters + Add */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar itens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none"
        >
          <option value="all">Todos</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>

        <Button
          onClick={() =>
            router.push(`/admin/colecoes/${collectionId}/novo`)
          }
        >
          <Plus />
          Novo Item
        </Button>
      </div>

      <BulkBar
        count={selected.size}
        actions={[
          {
            label: "Publicar",
            onClick: () => bulkAction("publish"),
          },
          {
            label: "Rascunho",
            onClick: () => bulkAction("draft"),
          },
          {
            label: "Excluir",
            onClick: () => setShowBulkDelete(true),
            variant: "danger",
          },
        ]}
        onClear={() => setSelected(new Set())}
        loading={bulkLoading}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BrasaPageLoader />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileText
            className="mx-auto mb-4 size-12 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="mb-2 text-sm text-muted-foreground">
            Nenhum item encontrado.
          </p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/admin/colecoes/${collectionId}/novo`)
            }
          >
            <Plus />
            Criar primeiro item
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                {primaryField && (
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                    {primaryField.name}
                  </TableHead>
                )}
                {visibleFields
                  .filter((f) => f.slug !== primaryField?.slug)
                  .slice(0, 2)
                  .map((f) => (
                    <TableHead
                      key={f.id}
                      className="hidden px-4 text-xs font-semibold uppercase tracking-wider md:table-cell"
                    >
                      {f.name}
                    </TableHead>
                  ))}
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="hidden px-4 text-xs font-semibold uppercase tracking-wider lg:table-cell">
                  Criado em
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  data-state={selected.has(item.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/admin/colecoes/${collectionId}/${item.id}`,
                    )
                  }
                >
                  <TableCell
                    className="w-10 px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      aria-label={`Selecionar ${getPrimaryValue(item)}`}
                    />
                  </TableCell>
                  {primaryField && (
                    <TableCell className="px-4">
                      <span className="font-medium text-foreground">
                        {getPrimaryValue(item)}
                      </span>
                    </TableCell>
                  )}
                  {visibleFields
                    .filter((f) => f.slug !== primaryField?.slug)
                    .slice(0, 2)
                    .map((f) => (
                      <TableCell
                        key={f.id}
                        className="hidden px-4 text-muted-foreground md:table-cell"
                      >
                        {renderCellValue(item.data?.[f.slug], f.type)}
                      </TableCell>
                    ))}
                  <TableCell className="px-4">
                    <Badge
                      variant={
                        item.status === "published" ? "success" : "secondary"
                      }
                    >
                      {item.status === "published" ? (
                        <>
                          <CheckCircle2 className="size-3" />
                          Publicado
                        </>
                      ) : (
                        "Rascunho"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden px-4 text-muted-foreground lg:table-cell">
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total} {total === 1 ? "item" : "itens"} - Pagina{" "}
                {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchItems(currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchItems(currentPage + 1)}
                >
                  Proximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <DeleteConfirm
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={() => bulkAction("delete")}
        title={`Excluir ${selected.size} ${selected.size === 1 ? "item" : "itens"}?`}
        description="Esta acao nao pode ser desfeita. Os itens serao movidos para a lixeira."
      />
    </AdminShell>
  );
}

function renderCellValue(value: any, type: string): React.ReactNode {
  if (value === null || value === undefined) return "-";
  if (type === "boolean") return value ? "Sim" : "Nao";
  if (type === "date" && typeof value === "string") {
    return new Date(value).toLocaleDateString("pt-BR");
  }
  if (type === "image" && typeof value === "string") {
    return (
      <img
        src={value}
        alt=""
        className="size-8 rounded object-cover"
        loading="lazy"
      />
    );
  }
  if (type === "json") return "{ ... }";
  const str = String(value);
  return str.length > 60 ? str.slice(0, 60) + "..." : str;
}
