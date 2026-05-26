"use client";

import { Button } from "@/components/ui/button";

type BulkAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

type BulkBarProps = {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  loading?: boolean;
};

export default function BulkBar({ count, actions, onClear, loading = false }: BulkBarProps) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium text-primary">
        {count} {count === 1 ? "selecionado" : "selecionados"}
      </span>
      <div className="h-4 w-px bg-primary/20" />
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          disabled={loading}
          className={action.variant === "danger" ? "text-destructive hover:text-destructive" : ""}
        >
          {action.label}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto text-muted-foreground"
      >
        Limpar seleção
      </Button>
    </div>
  );
}
