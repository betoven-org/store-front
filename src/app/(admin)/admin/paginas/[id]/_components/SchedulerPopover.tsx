"use client";

import React from "react";

type SchedulerPopoverProps = {
  scheduledAt: string | null;
  onScheduledAtChange: (val: string | null) => void;
  onSchedule: () => void;
  onCancel: () => void;
  onCancelSchedule: () => void;
  scheduling: boolean;
  isScheduled: boolean;
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SchedulerPopover({
  scheduledAt,
  onScheduledAtChange,
  onSchedule,
  onCancel,
  onCancelSchedule,
  scheduling,
  isScheduled,
}: SchedulerPopoverProps) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-xl">
      <p className="text-xs font-semibold text-foreground mb-3">
        Agendar publicação
      </p>
      <input
        type="datetime-local"
        value={scheduledAt ? toDatetimeLocal(scheduledAt) : ""}
        onChange={(e) => {
          const val = e.target.value;
          onScheduledAtChange(val ? new Date(val).toISOString() : null);
        }}
        min={toDatetimeLocal(new Date().toISOString())}
        aria-label="Data e hora do agendamento"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      {scheduledAt && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Agendado para{" "}
          {new Date(scheduledAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSchedule}
          disabled={!scheduledAt || scheduling}
          className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {scheduling ? "Agendando..." : "Agendar"}
        </button>
      </div>
      {isScheduled && (
        <button
          type="button"
          onClick={onCancelSchedule}
          disabled={scheduling}
          className="mt-2 w-full text-center text-xs text-destructive hover:underline disabled:opacity-50"
        >
          Cancelar agendamento
        </button>
      )}
    </div>
  );
}
