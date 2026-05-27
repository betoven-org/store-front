"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, Plus, Package, Pencil, Trash2, X, MoreVertical, ExternalLink, SlidersHorizontal, Calendar, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { AdminShell, StatusBadge, DeleteConfirm, ProductDrawer, BulkBar, Spinner } from "@brasa/admin";
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

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "published";
  categoryName: string | null;
  imageUrl: string | null;
  galleryImages: number[] | null;
  createdAt: string;
};

export default function ProductsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentPage = Number(searchParams.get("page") || "1");
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentFeatured = searchParams.get("featured") || "";
  const currentIsKit = searchParams.get("isKit") || "";
  const currentShowOnSite = searchParams.get("showOnSite") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  const [data, setData] = useState<ProductRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(currentSearch);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<"from" | "to" | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Bulk
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Drawer
  const [drawerProductId, setDrawerProductId] = useState<number | null>(null);

  // Kebab menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Single delete
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "10");
      if (currentSearch) params.set("search", currentSearch);
      if (currentStatus) params.set("status", currentStatus);
      if (currentCategory) params.set("category", currentCategory);
      if (currentFeatured) params.set("featured", currentFeatured);
      if (currentIsKit) params.set("isKit", currentIsKit);
      if (currentShowOnSite) params.set("showOnSite", currentShowOnSite);
      if (currentDateFrom) params.set("dateFrom", currentDateFrom);
      if (currentDateTo) params.set("dateTo", currentDateTo);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao carregar produtos");

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
  }, [currentPage, currentSearch, currentStatus, currentCategory, currentFeatured, currentIsKit, currentShowOnSite, currentDateFrom, currentDateTo]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetch("/api/admin/product-categories?limit=100&parentOnly=true")
      .then((r) => r.json())
      .then((json) => setCategories(json.docs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(null);
      }
    }
    if (showDatePicker) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDatePicker]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/admin/produtos?${params.toString()}`);
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
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) throw new Error();
      fetchProducts();
    } catch {
      // handled silently
    } finally {
      setBulkLoading(false);
    }
  };

  // Single delete
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchProducts();
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

  const activeFilterCount = [currentStatus, currentCategory, currentFeatured, currentIsKit, currentShowOnSite, currentDateFrom, currentDateTo].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearch("");
    router.push("/admin/produtos");
  };

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const baseUrl = (() => {
    const params = new URLSearchParams();
    if (currentSearch) params.set("search", currentSearch);
    if (currentStatus) params.set("status", currentStatus);
    if (currentCategory) params.set("category", currentCategory);
    if (currentFeatured) params.set("featured", currentFeatured);
    if (currentIsKit) params.set("isKit", currentIsKit);
    if (currentShowOnSite) params.set("showOnSite", currentShowOnSite);
    if (currentDateFrom) params.set("dateFrom", currentDateFrom);
    if (currentDateTo) params.set("dateTo", currentDateTo);
    const qs = params.toString();
    return qs ? `/admin/produtos?${qs}` : "/admin/produtos";
  })();
  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    <AdminShell title="Produtos">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
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
              placeholder="Buscar produtos..."
              aria-label="Buscar produtos"
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

          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm shadow transition-colors ${
              showFilters || activeFilterCount > 0
                ? "border-primary bg-primary/5 text-primary"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <Button nativeButton={false} render={<Link href="/admin/produtos/novo" />}>
          <Plus className="size-4" aria-hidden="true" />
          Novo Produto
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mb-4 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Filtros</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-primary hover:underline"
              >
                Limpar todos
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={currentStatus}
                onChange={(e) => updateParams({ status: e.target.value })}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todos</option>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Categoria</label>
              <select
                value={currentCategory}
                onChange={(e) => updateParams({ category: e.target.value })}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Destaque */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Destaque</label>
              <select
                value={currentFeatured}
                onChange={(e) => updateParams({ featured: e.target.value })}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>

            {/* Kit */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Kit</label>
              <select
                value={currentIsKit}
                onChange={(e) => updateParams({ isKit: e.target.value })}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>

            {/* Visivel no site */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Visivel no site</label>
              <select
                value={currentShowOnSite}
                onChange={(e) => updateParams({ showOnSite: e.target.value })}
                className="w-full rounded-md border bg-card px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(showDatePicker ? null : "from")}
                  className={`flex w-full items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-sm transition-colors ${
                    currentDateFrom || currentDateTo
                      ? "border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="size-3.5" aria-hidden="true" />
                  {currentDateFrom || currentDateTo ? (
                    <span className="truncate">
                      {currentDateFrom ? formatDateShort(currentDateFrom) : "..."}
                      {" - "}
                      {currentDateTo ? formatDateShort(currentDateTo) : "..."}
                    </span>
                  ) : (
                    <span>Selecionar</span>
                  )}
                  {(currentDateFrom || currentDateTo) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateParams({ dateFrom: "", dateTo: "" });
                        setShowDatePicker(null);
                      }}
                      className="ml-auto text-muted-foreground hover:text-muted-foreground"
                      aria-label="Limpar data"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </button>

                {showDatePicker && (
                  <DatePickerDropdown
                    dateFrom={currentDateFrom}
                    dateTo={currentDateTo}
                    activeField={showDatePicker}
                    onChangeField={setShowDatePicker}
                    onApply={(from, to) => {
                      updateParams({ dateFrom: from, dateTo: to });
                      setShowDatePicker(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {currentStatus && (
            <FilterPill label={`Status: ${currentStatus === "published" ? "Publicado" : "Rascunho"}`} onRemove={() => updateParams({ status: "" })} />
          )}
          {currentCategory && (
            <FilterPill label={`Categoria: ${categories.find((c) => String(c.id) === currentCategory)?.name || currentCategory}`} onRemove={() => updateParams({ category: "" })} />
          )}
          {currentFeatured && (
            <FilterPill label={`Destaque: ${currentFeatured === "true" ? "Sim" : "Nao"}`} onRemove={() => updateParams({ featured: "" })} />
          )}
          {currentIsKit && (
            <FilterPill label={`Kit: ${currentIsKit === "true" ? "Sim" : "Nao"}`} onRemove={() => updateParams({ isKit: "" })} />
          )}
          {currentShowOnSite && (
            <FilterPill label={`Visivel: ${currentShowOnSite === "true" ? "Sim" : "Nao"}`} onRemove={() => updateParams({ showOnSite: "" })} />
          )}
          {(currentDateFrom || currentDateTo) && (
            <FilterPill
              label={`Data: ${currentDateFrom ? formatDateShort(currentDateFrom) : "..."} - ${currentDateTo ? formatDateShort(currentDateTo) : "..."}`}
              onRemove={() => updateParams({ dateFrom: "", dateTo: "" })}
            />
          )}
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-primary hover:underline"
          >
            Limpar todos
          </button>
        </div>
      )}

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
          <Spinner className="size-8" />
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Package
            className="mx-auto mb-4 size-12 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>
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
                  <TableHead className="w-14 px-4" />
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Categoria
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
                {data.map((product) => (
                  <TableRow
                    key={product.id}
                    className={`cursor-pointer ${selected.has(product.id) ? "bg-primary/[0.03]" : ""}`}
                    onClick={() => setDrawerProductId(product.id)}
                  >
                    <TableCell className="w-10 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                        className="size-4 rounded border-input accent-sidebar-accent"
                        aria-label={`Selecionar ${product.name}`}
                      />
                    </TableCell>
                    <TableCell className="w-14 px-4">
                      {product.imageUrl ? (
                        <div className="relative inline-flex">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={32}
                            height={32}
                            className="rounded object-cover"
                          />
                          {product.galleryImages && product.galleryImages.length > 0 && (
                            <span
                              aria-label={`+${product.galleryImages.length} imagens na galeria`}
                              className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground/70 text-[10px] leading-none text-white"
                            >
                              +{product.galleryImages.length}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded bg-muted">
                          <Package className="size-4 text-muted-foreground/50" aria-hidden="true" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4">
                      <button
                        type="button"
                        onClick={() => setDrawerProductId(product.id)}
                        className="text-left font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {product.name}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {product.categoryName || "Sem categoria"}
                    </TableCell>
                    <TableCell className="px-4">
                      <StatusBadge status={product.status} />
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">
                      {formatDate(product.createdAt)}
                    </TableCell>
                    <TableCell className="px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Popover open={openMenuId === product.id} onOpenChange={(open) => setOpenMenuId(open ? product.id : null)}>
                        <PopoverTrigger
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Ações"
                        >
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-40 p-1">
                          <button
                            type="button"
                            onClick={() => { setOpenMenuId(null); setDrawerProductId(product.id); }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Editar
                          </button>
                          <a
                            href={`/${product.slug}/p`}
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
                            onClick={() => { setOpenMenuId(null); setDeleteId(product.id); }}
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
      <ProductDrawer
        productId={drawerProductId}
        onClose={() => setDrawerProductId(null)}
        onSaved={fetchProducts}
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
        title={`Excluir ${selected.size} ${selected.size === 1 ? "produto" : "produtos"}?`}
        description="Esta acao nao pode ser desfeita. Os produtos serao permanentemente removidos."
      />
    </AdminShell>
  );
}

function formatDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 hover:text-primary/70" aria-label={`Remover filtro ${label}`}>
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

function DatePickerDropdown({
  dateFrom,
  dateTo,
  activeField,
  onChangeField,
  onApply,
}: {
  dateFrom: string;
  dateTo: string;
  activeField: "from" | "to";
  onChangeField: (f: "from" | "to") => void;
  onApply: (from: string, to: string) => void;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    const ref = activeField === "to" && dateTo ? dateTo : dateFrom || "";
    return ref ? new Date(ref + "T12:00:00") : today;
  });
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = viewDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const toDateStr = (d: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const selectDay = (day: number) => {
    const val = toDateStr(day);
    if (activeField === "from") {
      setLocalFrom(val);
      if (localTo && val > localTo) setLocalTo("");
      onChangeField("to");
    } else {
      if (localFrom && val < localFrom) {
        setLocalFrom(val);
        setLocalTo("");
        onChangeField("to");
      } else {
        setLocalTo(val);
      }
    }
  };

  const isInRange = (day: number) => {
    const val = toDateStr(day);
    return localFrom && localTo && val >= localFrom && val <= localTo;
  };

  const isSelected = (day: number) => {
    const val = toDateStr(day);
    return val === localFrom || val === localTo;
  };

  const isToday = (day: number) => {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  };

  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-border bg-card p-3 shadow-xl">
      {/* Tabs */}
      <div className="mb-3 flex rounded-lg border bg-background p-0.5">
        <button
          type="button"
          onClick={() => onChangeField("from")}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            activeField === "from" ? "bg-card text-foreground shadow" : "text-muted-foreground"
          }`}
        >
          De: {localFrom ? formatDateShort(localFrom) : "--/--/----"}
        </button>
        <button
          type="button"
          onClick={() => onChangeField("to")}
          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            activeField === "to" ? "bg-card text-foreground shadow" : "text-muted-foreground"
          }`}
        >
          Ate: {localTo ? formatDateShort(localTo) : "--/--/----"}
        </button>
      </div>

      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-muted-foreground" aria-label="Mês anterior">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="text-sm font-medium capitalize text-foreground">{monthName}</span>
        <button type="button" onClick={nextMonth} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-muted-foreground" aria-label="Próximo mês">
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {weekdays.map((w, i) => (
          <span key={i} className="py-1 text-xs font-medium text-muted-foreground">{w}</span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 text-center">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const selected = isSelected(day);
          const inRange = isInRange(day);
          const todayMark = isToday(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => selectDay(day)}
              className={`relative mx-auto flex size-8 items-center justify-center rounded-full text-sm transition-colors ${
                selected
                  ? "bg-foreground font-medium text-background"
                  : inRange
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {day}
              {todayMark && !selected && (
                <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <button
          type="button"
          onClick={() => { onApply("", ""); }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={() => onApply(localFrom, localTo)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-foreground text-background text-[13px] font-medium h-8 px-3 transition-all hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 text-xs h-7"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
