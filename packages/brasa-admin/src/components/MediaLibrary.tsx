"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type DragEvent,
} from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaLibraryProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (mediaId: number, mediaUrl: string) => void;
};

type MediaItem = {
  id: number;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  alt?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
};

type AspectRatioKey = "free" | "1:1" | "16:9" | "4:3";

const ASPECT_RATIOS: Record<AspectRatioKey, number | undefined> = {
  free: undefined,
  "1:1": 1,
  "16:9": 16 / 9,
  "4:3": 4 / 3,
};

// ── SVG icons ─────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string,
  mimeType: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      mimeType,
      0.92
    );
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LibraryTab({
  onSelect,
}: {
  onSelect: (item: MediaItem) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const LIMIT = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset when search changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    setSelected(null);
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/admin/media?${params}`)
      .then((r) => r.json())
      .then((data: { docs: MediaItem[]; totalDocs: number }) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? data.docs : [...prev, ...data.docs]));
        setTotalDocs(data.totalDocs);
      })
      .catch(() => {
        // silent — grid stays empty or with previous items
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  const hasMore = items.length < totalDocs;

  const handleItemClick = (item: MediaItem) => {
    setSelected((prev) => (prev?.id === item.id ? null : item));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-5 py-3 border-b border-border">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="search"
            placeholder="Buscar por nome ou alt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 && !loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhuma imagem encontrada.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {items.map((item) => {
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`relative aspect-square rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all ${
                    isSelected
                      ? "ring-2 ring-ring ring-offset-2"
                      : "hover:ring-2 hover:ring-ring hover:ring-offset-1"
                  }`}
                  aria-pressed={isSelected}
                  aria-label={item.filename}
                >
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.alt || item.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={160}
                    height={160}
                  />
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white shadow-md">
                      <IconCheck />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-6">
            <IconSpinner />
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
            >
              Carregar mais
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border bg-background">
        <div className="text-xs text-muted-foreground truncate min-w-0">
          {selected ? (
            <span className="truncate">
              <span className="font-medium text-foreground">{selected.filename}</span>
              {" · "}
              {formatBytes(selected.size)}
              {selected.width && selected.height
                ? ` · ${selected.width}×${selected.height}`
                : ""}
            </span>
          ) : (
            <span>{totalDocs} {totalDocs === 1 ? "arquivo" : "arquivos"}</span>
          )}
        </div>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="shrink-0 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Selecionar
        </button>
      </div>
    </div>
  );
}

function UploadTab({
  onUploaded,
}: {
  onUploaded: (item: MediaItem) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>("free");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Apenas arquivos de imagem são suportados.");
      return;
    }
    // Clean up previous
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setCrop(undefined);
    setCompletedCrop(null);
    setError(null);
  }, [previewUrl]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const ratio = ASPECT_RATIOS[aspectRatio];
    if (ratio) {
      const c = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, ratio, width, height),
        width,
        height
      );
      setCrop(c);
    }
  };

  const handleAspectChange = (key: AspectRatioKey) => {
    setAspectRatio(key);
    if (!imageRef.current) return;
    const { width, height } = imageRef.current;
    const ratio = ASPECT_RATIOS[key];
    if (ratio) {
      const c = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, ratio, width, height),
        width,
        height
      );
      setCrop(c);
    } else {
      setCrop(undefined);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      let uploadBlob: Blob = file;
      let uploadName = file.name;

      if (completedCrop && imageRef.current) {
        uploadBlob = await getCroppedBlob(
          imageRef.current,
          completedCrop,
          file.name,
          file.type || "image/jpeg"
        );
        uploadName = file.name;
      }

      const formData = new FormData();
      formData.append("file", uploadBlob, uploadName);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Erro ao fazer upload");
      }

      const record: MediaItem = await res.json();
      onUploaded(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!file || !previewUrl) {
    return (
      <div className="flex flex-col flex-1 p-5">
        <div
          role="button"
          tabIndex={0}
          aria-label="Selecionar imagem para upload"
          className={`flex flex-col items-center justify-center gap-3 flex-1 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-background"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <span className="text-muted-foreground">
            <IconUpload />
          </span>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Arraste uma imagem ou{" "}
              <span className="text-primary">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — max 10 MB</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Aspect ratio controls */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground mr-1">Proporção:</span>
        {(Object.keys(ASPECT_RATIOS) as AspectRatioKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleAspectChange(key)}
            className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
              aspectRatio === key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {key === "free" ? "Livre" : key}
          </button>
        ))}
        <button
          type="button"
          onClick={handleReset}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
        >
          Trocar imagem
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-accent">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={ASPECT_RATIOS[aspectRatio]}
          className="max-h-full"
        >
          <img
            ref={imageRef}
            src={previewUrl}
            alt="Preview para recorte"
            onLoad={onImageLoad}
            style={{ maxHeight: "380px", maxWidth: "100%", display: "block" }}
          />
        </ReactCrop>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border bg-background">
        <div className="text-xs text-muted-foreground truncate min-w-0">
          <span className="font-medium text-foreground truncate">{file.name}</span>
          {" · "}{formatBytes(file.size)}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {uploading && <IconSpinner />}
            {uploading ? "Enviando..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MediaLibrary({ open, onClose, onSelect }: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleLibrarySelect = (item: MediaItem) => {
    onSelect(item.id, item.url);
    onClose();
  };

  const handleUploaded = (item: MediaItem) => {
    onSelect(item.id, item.url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de Midias"
    >
      {/* Backdrop close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-4xl flex flex-col rounded-xl bg-card shadow-2xl"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">Biblioteca de Midias</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <IconX />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-border shrink-0">
          {(["library", "upload"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "library" ? "Biblioteca" : "Upload"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === "library" ? (
            <LibraryTab onSelect={handleLibrarySelect} />
          ) : (
            <UploadTab onUploaded={handleUploaded} />
          )}
        </div>
      </div>
    </div>
  );
}
