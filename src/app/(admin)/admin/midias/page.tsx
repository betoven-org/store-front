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
  filesize?: number;
  width?: number;
  height?: number;
  mimeType?: string;
};

type ApiResponse = {
  docs: MediaItem[];
  totalPages: number;
  page: number;
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MidiasPage() {
  const [data, setData] = useState<MediaItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sheetItem, setSheetItem] = useState<MediaItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBulk, setDeleteBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/media?page=${page}`);
      if (!res.ok) throw new Error("Erro ao carregar midias.");
      const json: ApiResponse = await res.json();
      setData(json.docs);
      setTotalPages(json.totalPages);
      setCurrentPage(json.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

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
    setSheetOpen(true);
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

  return (
    <AdminShell title="Midias">
      {/* Upload area */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragging
            ? "border-[#0d61ac] bg-blue-50/50"
            : "border-border bg-background hover:border-[#0d61ac] hover:bg-blue-50/20"
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5" />
            <span className="text-sm font-medium text-muted-foreground">
              Enviando...
            </span>
          </div>
        ) : (
          <>
            <Upload className="mb-3 size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">
              Arraste imagens aqui ou clique para selecionar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, GIF, WebP</p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Bulk action bar */}
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
          <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <ImageIcon className="mx-auto mb-4 size-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma midia encontrada.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Envie imagens usando a area acima.
          </p>
        </div>
      ) : (
        <>
          {/* Image grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {data.map((item) => {
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg ${
                    isSelected
                      ? "border-[#0d61ac] ring-2 ring-[#0d61ac]/25"
                      : "border-border hover:border-border"
                  }`}
                  onClick={() => openSheet(item)}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-accent">
                    <Image
                      src={item.url}
                      alt={item.alt || item.filename}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </div>

                  {/* Info */}
                  <div className="px-2.5 py-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.filename}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatFileSize(item.filesize)}
                      {item.width && item.height
                        ? ` · ${item.width}x${item.height}`
                        : ""}
                    </p>
                  </div>

                  {/* Checkbox (top-left) */}
                  <div
                    className={`absolute top-2 left-2 transition-opacity ${
                      isSelected
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={(e) => toggleSelect(item.id, e)}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-card shadow">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                        aria-label={`Selecionar ${item.filename}`}
                      />
                    </div>
                  </div>

                  {/* Delete (top-right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(item.id);
                    }}
                    className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Excluir ${item.filename}`}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </button>
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
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchMedia(currentPage + 1)}
                >
                  Proximo
                  <ChevronRight className="size-4" aria-hidden="true" />
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
              {/* Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background">
                <Image
                  src={sheetItem.url}
                  alt={sheetItem.alt || sheetItem.filename}
                  fill
                  className="object-contain"
                  sizes="400px"
                />
              </div>

              {/* Metadata */}
              <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                    Arquivo
                  </dt>
                  <dd className="truncate text-foreground">
                    {sheetItem.filename}
                  </dd>
                </div>
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
                    {formatFileSize(sheetItem.filesize)}
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
                {sheetItem.alt && (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      Alt text
                    </dt>
                    <dd className="text-foreground">{sheetItem.alt}</dd>
                  </div>
                )}
              </dl>

              {/* URL copiavel */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">URL</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <p className="flex-1 truncate text-xs text-foreground">
                    {sheetItem.url}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyUrl(sheetItem.url)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-gray-200 hover:text-foreground"
                    aria-label="Copiar URL"
                  >
                    {copied ? (
                      <Check className="size-4 text-green-600" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => setDeleteId(sheetItem.id)}
                >
                  <Trash2 aria-hidden="true" />
                  Excluir midia
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete single confirm */}
      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteSingle}
        title="Excluir midia?"
        description="Esta acao nao pode ser desfeita. A midia sera permanentemente removida."
      />

      {/* Delete bulk confirm */}
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
