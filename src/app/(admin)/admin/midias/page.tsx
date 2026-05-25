"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  AlertTriangle,
  ImageIcon,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Search,
  Grid2X2,
  List,
  FolderPlus,
} from "lucide-react";
import { AdminShell, DeleteConfirm, BulkBar, Spinner } from "@brasa/admin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type MediaItem = {
  id: number;
  filename: string;
  alt?: string;
  url: string;
  size?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  createdAt?: string;
};

type ApiResponse = {
  docs: MediaItem[];
  totalPages: number;
  page: number;
  totalDocs?: number;
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mimeLabel(mime?: string): string {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export default function MidiasPage() {
  const [data, setData] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sheetItem, setSheetItem] = useState<MediaItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBulk, setDeleteBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editAlt, setEditAlt] = useState("");
  const [editFilename, setEditFilename] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchMedia = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("search", search);
        if (typeFilter) params.set("type", typeFilter);
        if (sortBy) params.set("sort", sortBy);
        const res = await fetch(`/api/admin/media?${params}`);
        if (!res.ok) throw new Error("Erro ao carregar midias.");
        const json: ApiResponse = await res.json();
        setData(json.docs);
        setTotalPages(json.totalPages);
        setCurrentPage(json.page);
        setTotalDocs(json.totalDocs ?? json.docs.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter, sortBy]
  );

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchMedia(1), 400);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Erro ao enviar ${file.name}.`);
        }
      }
      fetchMedia(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSheet = (item: MediaItem) => {
    setSheetItem(item);
    setEditAlt(item.alt || "");
    setEditFilename(item.filename);
    setSheetOpen(true);
  };

  const handleSaveMetadata = async () => {
    if (!sheetItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/media/${sheetItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: editAlt, filename: editFilename }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro ao salvar.");
        return;
      }
      const updated = await res.json();
      setSheetItem(updated);
      setData((prev) =>
        prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Erro ao excluir midia.");
        return;
      }
      if (sheetItem?.id === deleteId) {
        setSheetOpen(false);
        setSheetItem(null);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      fetchMedia(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir midia.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteBulk = async () => {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/media/${id}`, { method: "DELETE" })
        )
      );
      if (sheetItem && selectedIds.has(sheetItem.id)) {
        setSheetOpen(false);
        setSheetItem(null);
      }
      setSelectedIds(new Set());
      fetchMedia(currentPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao excluir midias."
      );
    } finally {
      setDeleting(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalSize = data.reduce((sum, m) => sum + (m.size ?? 0), 0);

  return (
    <AdminShell title="Midias">
      {/* Subheader */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalDocs} arquivos
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FolderPlus className="size-3.5" />
            Pasta
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="size-3.5" />
            {uploading ? "Enviando..." : "Enviar midia"}
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar arquivos..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Todos os tipos</option>
          <option value="image">Imagens</option>
          <option value="video">Videos</option>
          <option value="pdf">PDF</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="recent">Mais recentes</option>
          <option value="oldest">Mais antigos</option>
          <option value="name">Nome A-Z</option>
          <option value="size">Maior tamanho</option>
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Visualizar em grade"
          >
            <Grid2X2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Visualizar em lista"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`mb-6 flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40"
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Upload className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {uploading ? "Enviando arquivos..." : "Solte arquivos aqui para enviar"}
          </p>
          <p className="text-xs text-muted-foreground">
            Aceita JPG, PNG, WebP, MP4, PDF · ate 50 MB por arquivo ·{" "}
            ou{" "}
            <span className="font-medium text-primary">
              busque no seu computador
            </span>
          </p>
        </div>
        {totalDocs > 0 && (
          <div className="hidden shrink-0 text-right sm:block">
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatFileSize(totalSize)}
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-danger-bg p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-xs font-medium underline"
          >
            Fechar
          </button>
        </div>
      )}

      <BulkBar
        count={selectedIds.size}
        loading={deleting}
        onClear={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Excluir selecionados",
            variant: "danger",
            onClick: () => setDeleteBulk(true),
          },
        ]}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="h-7 w-7" />
          <span className="ml-3 text-sm text-muted-foreground">
            Carregando...
          </span>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <ImageIcon
            className="mx-auto mb-4 size-12 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma midia encontrada.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Envie imagens usando a area acima.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-border hover:shadow-sm"
                  }`}
                  onClick={() => openSheet(item)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={item.url}
                      alt={item.alt || item.filename}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />

                    {/* Dimensions badge */}
                    {item.width && item.height && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums backdrop-blur-sm">
                        {item.width}&times;{item.height}
                      </span>
                    )}

                    {/* Selection check */}
                    {isSelected && (
                      <div className="absolute top-2 left-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                          <Check className="size-3" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info footer */}
                  <div className="bg-card px-3 py-2.5">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {item.filename}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatFileSize(item.size)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {mimeLabel(item.mimeType)}
                      </span>
                    </div>
                  </div>

                  {/* Checkbox overlay */}
                  <div
                    className={`absolute top-2 left-2 transition-opacity ${
                      isSelected
                        ? "opacity-0"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => toggleSelect(item.id, e)}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/90 shadow-sm backdrop-blur-sm">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                        aria-label={`Selecionar ${item.filename}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchMedia(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchMedia(currentPage + 1)}
                >
                  Proximo
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* List view */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-secondary">
                <tr>
                  <th className="w-10 px-3 py-2.5" />
                  <th className="w-12 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Arquivo
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Tamanho
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Dimensoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => openSheet(item)}
                      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                        isSelected ? "bg-accent" : ""
                      }`}
                    >
                      <td className="w-10 px-3 py-2" onClick={(e) => toggleSelect(item.id, e)}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          aria-label={`Selecionar ${item.filename}`}
                        />
                      </td>
                      <td className="w-12 px-3 py-2">
                        <div className="relative h-8 w-8 overflow-hidden rounded bg-muted">
                          <Image
                            src={item.url}
                            alt={item.alt || item.filename}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">
                          {item.filename}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {mimeLabel(item.mimeType)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {formatFileSize(item.size)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {item.width && item.height
                          ? `${item.width}x${item.height}`
                          : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pagina {currentPage} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchMedia(currentPage - 1)}
                >
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchMedia(currentPage + 1)}
                >
                  Proximo
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Media detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="truncate pr-8 text-sm">
              {sheetItem?.filename}
            </SheetTitle>
          </SheetHeader>

          {sheetItem && (
            <div className="flex flex-col gap-5 p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                <Image
                  src={sheetItem.url}
                  alt={sheetItem.alt || sheetItem.filename}
                  fill
                  className="object-contain"
                  sizes="400px"
                />
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nome do arquivo
                  </label>
                  <input
                    type="text"
                    value={editFilename}
                    onChange={(e) => setEditFilename(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Alt text
                  </label>
                  <input
                    type="text"
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    placeholder="Descreva a imagem para acessibilidade"
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={saving || (editAlt === (sheetItem.alt || "") && editFilename === sheetItem.filename)}
                  onClick={handleSaveMetadata}
                >
                  {saving ? "Salvando..." : "Salvar alteracoes"}
                </Button>
              </div>

              {/* Read-only metadata */}
              <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                {sheetItem.mimeType && (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      Tipo
                    </dt>
                    <dd className="text-foreground">{sheetItem.mimeType}</dd>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                    Tamanho
                  </dt>
                  <dd className="text-foreground">
                    {formatFileSize(sheetItem.size)}
                  </dd>
                </div>
                {sheetItem.width && sheetItem.height && (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      Dimensoes
                    </dt>
                    <dd className="text-foreground">
                      {sheetItem.width}x{sheetItem.height}px
                    </dd>
                  </div>
                )}
                {sheetItem.createdAt && (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      Enviado em
                    </dt>
                    <dd className="text-foreground">
                      {new Date(sheetItem.createdAt).toLocaleDateString("pt-BR")}
                    </dd>
                  </div>
                )}
              </dl>

              {/* URL copy */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  URL
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <p className="flex-1 truncate text-xs text-foreground">
                    {sheetItem.url}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyUrl(sheetItem.url)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Copiar URL"
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteId(sheetItem.id)}
                >
                  <Trash2 />
                  Excluir midia
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteSingle}
        title="Excluir midia?"
        description="Esta acao nao pode ser desfeita. A midia sera permanentemente removida."
      />

      <DeleteConfirm
        open={deleteBulk}
        onClose={() => setDeleteBulk(false)}
        onConfirm={handleDeleteBulk}
        title={`Excluir ${selectedIds.size} ${selectedIds.size === 1 ? "midia" : "midias"}?`}
        description="Esta acao nao pode ser desfeita. Todas as midias selecionadas serao permanentemente removidas."
      />
    </AdminShell>
  );
}
