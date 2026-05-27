"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { AdminShell, DeleteConfirm, BulkBar, ProductCategoryDrawer, BrasaPageLoader } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  imageUrl: string | null;
};

export default function CategoriasProdutoPage() {
  const [data, setData] = useState<ProductCategory[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [drawerId, setDrawerId] = useState<number | null>(null);

  const fetchCategories = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/product-categories?page=${page}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao carregar categorias de produto.");
      }
      const json = await res.json();
      setData(json.docs || []);
      setTotalPages(json.totalPages || 1);
      setCurrentPage(json.page || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/product-categories/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Categoria possui produtos vinculados.");
        return;
      }
      if (!res.ok) throw new Error();
      fetchCategories(currentPage);
    } catch {
      setError("Erro ao excluir categoria de produto.");
    }
  };

  const doBulkDelete = async () => {
    setBulkLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/product-categories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro na exclusao em massa.");
        return;
      }
      fetchCategories(currentPage);
    } catch {
      setError("Erro na exclusao em massa.");
    } finally {
      setBulkLoading(false);
    }
  };

  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && selected.size < data.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(data.map((c) => c.id)));
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AdminShell title="Categorias de Produto">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gerencie as categorias de produto.</p>
        <Button nativeButton={false} render={<Link href="/admin/categorias-produto/novo" />}>
          <Plus />
          Nova Categoria
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Fechar
          </button>
        </div>
      )}

      <BulkBar
        count={selected.size}
        actions={[{ label: "Excluir", onClick: () => setShowBulkDelete(true), variant: "danger" }]}
        onClear={() => setSelected(new Set())}
        loading={bulkLoading}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <BrasaPageLoader />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Tags className="mx-auto mb-4 size-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Nenhuma categoria de produto encontrada.</p>
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
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Nome
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Ordem
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider">
                  Slug
                </TableHead>
                <TableHead className="px-4 text-right text-xs font-semibold uppercase tracking-wider">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cat) => (
                <TableRow
                  key={cat.id}
                  data-state={selected.has(cat.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => setDrawerId(cat.id)}
                >
                  <TableCell className="w-10 px-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(cat.id)}
                      onCheckedChange={() => toggleOne(cat.id)}
                      aria-label={`Selecionar ${cat.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <button
                      type="button"
                      onClick={() => setDrawerId(cat.id)}
                      className="text-left font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {cat.name}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">
                    {cat.sortOrder}
                  </TableCell>
                  <TableCell className="px-4 text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDrawerId(cat.id)}
                        aria-label={`Editar ${cat.name}`}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(cat.id)}
                        aria-label={`Excluir ${cat.name}`}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchCategories(currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchCategories(currentPage + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ProductCategoryDrawer
        categoryId={drawerId}
        onClose={() => setDrawerId(null)}
        onSaved={() => fetchCategories(currentPage)}
      />

      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId !== null) handleDelete(deleteId);
        }}
        title="Excluir categoria de produto?"
        description="Esta acao nao pode ser desfeita. A categoria sera permanentemente removida."
      />

      <DeleteConfirm
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={doBulkDelete}
        title={`Excluir ${selected.size} ${selected.size === 1 ? "categoria" : "categorias"}?`}
        description="Esta acao nao pode ser desfeita. Categorias com produtos vinculados nao serao excluidas."
      />
    </AdminShell>
  );
}
