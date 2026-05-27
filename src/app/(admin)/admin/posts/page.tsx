"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Plus, FileText, Pencil, Trash2, X, MoreVertical, ExternalLink } from "lucide-react";
import { AdminShell, StatusBadge, DeleteConfirm, PostDrawer, BulkBar, BrasaPageLoader } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type PostRow = {
  id: number;
  title: string;
  slug: string;
  status: "draft" | "published";
  categoryName: string | null;
  authorName: string | null;
  createdAt: string;
};

export default function PostsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get("page") || "1");
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "";

  const [data, setData] = useState<PostRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(currentSearch);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Bulk
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Drawer
  const [drawerPostId, setDrawerPostId] = useState<number | null>(null);

  // Kebab menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Single delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "10");
      if (currentSearch) params.set("search", currentSearch);
      if (currentStatus) params.set("status", currentStatus);

      const res = await fetch(`/api/admin/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar posts");

      const json = await res.json();
      setData(json.docs);
      setTotalPages(json.totalPages);
    } catch {
      setData([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  }, [currentPage, currentSearch, currentStatus]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/posts?${params.toString()}`);
  };

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ search: value });
    }, 400);
  };

  const clearSearch = () => {
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateParams({ search: "" });
  };

  // Selection handlers
  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && selected.size < data.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((p) => p.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk actions
  const doBulk = async (action: "delete" | "publish" | "unpublish") => {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error();
      fetchPosts();
    } catch {
      // handled silently
    } finally {
      setBulkLoading(false);
    }
  };

  // Single delete
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchPosts();
    } catch {
      // handled silently
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const baseUrl = (() => {
    const params = new URLSearchParams();
    if (currentSearch) params.set("search", currentSearch);
    if (currentStatus) params.set("status", currentStatus);
    const qs = params.toString();
    return qs ? `/admin/posts?${qs}` : "/admin/posts";
  })();
  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    <AdminShell title="Posts">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") clearSearch(); }}
              placeholder="Buscar posts..."
              aria-label="Buscar posts"
              className="w-full rounded-md border bg-card py-2 pl-10 pr-9 text-sm shadow placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <select
            value={currentStatus}
            onChange={(e) => updateParams({ status: e.target.value })}
            aria-label="Filtrar por status"
            className="rounded-md border bg-card px-3 py-2 text-sm shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        <Button nativeButton={false} render={<Link href="/admin/posts/novo" />}>
          <Plus className="size-4" aria-hidden="true" />
          Novo Post
        </Button>
      </div>

      {/* Bulk actions bar */}
      <BulkBar
        count={selected.size}
        loading={bulkLoading}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: "Publicar", onClick: () => doBulk("publish") },
          { label: "Despublicar", onClick: () => doBulk("unpublish") },
          { label: "Excluir", onClick: () => setShowBulkDelete(true), variant: "danger" },
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BrasaPageLoader />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <FileText
            className="mx-auto mb-4 size-12 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Nenhum post encontrado.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAll}
                      className="size-4 rounded border-input accent-sidebar-accent"
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Título
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Categoria
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Autor
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((post) => (
                  <TableRow
                    key={post.id}
                    className={`cursor-pointer ${selected.has(post.id) ? "bg-primary/[0.03]" : ""}`}
                    onClick={() => setDrawerPostId(post.id)}
                  >
                    <TableCell className="w-10 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(post.id)}
                        onChange={() => toggleOne(post.id)}
                        className="size-4 rounded border-input accent-sidebar-accent"
                        aria-label={`Selecionar ${post.title}`}
                      />
                    </TableCell>
                    <TableCell className="px-4">
                      <button
                        type="button"
                        onClick={() => setDrawerPostId(post.id)}
                        className="text-left font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {post.title}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {post.categoryName || "---"}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {post.authorName || "---"}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge status={post.status} />
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {formatDate(post.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Popover open={openMenuId === post.id} onOpenChange={(open) => setOpenMenuId(open ? post.id : null)}>
                        <PopoverTrigger
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Ações"
                        >
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-40 p-1">
                          <button
                            type="button"
                            onClick={() => { setOpenMenuId(null); setDrawerPostId(post.id); }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Editar
                          </button>
                          <a
                            href={`/posts/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpenMenuId(null)}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <ExternalLink className="size-3.5" aria-hidden="true" />
                            Ver no site
                          </a>
                          <button
                            type="button"
                            onClick={() => { setOpenMenuId(null); setDeleteId(post.id); }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            Remover
                          </button>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Pagina {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  {hasPrev ? (
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`${baseUrl}${separator}page=${currentPage - 1}`} />}>
                      Anterior
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Anterior
                    </Button>
                  )}
                  {hasNext ? (
                    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`${baseUrl}${separator}page=${currentPage + 1}`} />}>
                      Próximo
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Próximo
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit drawer */}
      <PostDrawer
        postId={drawerPostId}
        onClose={() => setDrawerPostId(null)}
        onSaved={fetchPosts}
      />

      {/* Single delete */}
      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId !== null) handleDelete(deleteId);
        }}
      />

      {/* Bulk delete */}
      <DeleteConfirm
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={() => doBulk("delete")}
        title={`Excluir ${selected.size} ${selected.size === 1 ? "post" : "posts"}?`}
        description="Esta acao nao pode ser desfeita. Os posts e suas tags serao permanentemente removidos."
      />
    </AdminShell>
  );
}
