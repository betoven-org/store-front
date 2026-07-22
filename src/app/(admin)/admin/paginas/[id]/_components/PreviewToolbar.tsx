"use client";

import React from "react";

type PreviewDevice = "desktop" | "tablet" | "mobile";

type PreviewToolbarProps = {
  previewDevice: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  inlineEdit: boolean;
  onToggleInlineEdit: () => void;
  urlLabel: string;
  onReload: () => void;
  onOpenExternal: () => void;
};

export function PreviewToolbar({
  previewDevice,
  onDeviceChange,
  inlineEdit,
  onToggleInlineEdit,
  urlLabel,
  onReload,
  onOpenExternal,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-1.5">
      {/* Device switcher */}
      <div className="flex gap-0.5 rounded-md bg-accent p-0.5">
        <button
          type="button"
          onClick={() => onDeviceChange("desktop")}
          className={`rounded p-1 transition-colors ${previewDevice === "desktop" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          title="Desktop"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDeviceChange("tablet")}
          className={`rounded p-1 transition-colors ${previewDevice === "tablet" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          title="Tablet"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDeviceChange("mobile")}
          className={`rounded p-1 transition-colors ${previewDevice === "mobile" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          title="Mobile"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18" />
          </svg>
        </button>
      </div>

      {/* Inline edit toggle */}
      <button
        type="button"
        onClick={onToggleInlineEdit}
        title={inlineEdit ? "Desativar edição inline" : "Edição inline"}
        aria-pressed={inlineEdit}
        className={`rounded p-1 transition-colors ${inlineEdit ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>

      <span className="flex-1 rounded bg-background px-2 py-0.5 text-[11px] text-muted-foreground font-mono border border-border truncate">
        {urlLabel}
      </span>

      <button
        type="button"
        onClick={onReload}
        className="rounded p-1 text-muted-foreground hover:text-foreground"
        title="Recarregar"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onOpenExternal}
        className="rounded p-1 text-muted-foreground hover:text-foreground"
        title="Abrir no site"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>
    </div>
  );
}
