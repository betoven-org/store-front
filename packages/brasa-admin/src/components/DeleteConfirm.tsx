"use client";

import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

type DeleteConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
};

export default function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  title = "Tem certeza?",
  description = "Esta acao nao pode ser desfeita. O registro sera permanentemente removido.",
}: DeleteConfirmProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div
        className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 256 256"
            fill="currentColor"
            className="text-destructive"
            aria-hidden="true"
          >
            <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z" />
          </svg>
        </div>

        <h2
          id="delete-confirm-title"
          className="mb-2 text-center text-lg font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">{description}</p>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
