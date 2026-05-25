"use client";

import { useState } from "react";
import MediaLibrary from "./MediaLibrary";

type MediaPickerProps = {
  value: string | null;
  onChange: (url: string) => void;
};

export default function MediaPicker({ value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img
            src={value}
            alt="Imagem selecionada"
            className="h-48 w-full object-cover"
            loading="lazy"
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-destructive/90"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input px-6 py-8 transition-colors hover:border-primary hover:bg-muted/50"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-2 text-muted-foreground"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">
              Selecionar imagem
            </span>{" "}
            da biblioteca
          </p>
        </button>
      )}

      <MediaLibrary
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(_mediaId, mediaUrl) => {
          onChange(mediaUrl);
          setOpen(false);
        }}
      />
    </div>
  );
}
