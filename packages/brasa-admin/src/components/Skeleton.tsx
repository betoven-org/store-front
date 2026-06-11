"use client";

type SkeletonProps = {
  className?: string;
};

export default function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted ${className}`}
      aria-hidden="true"
    />
  );
}

type SkeletonRowsProps = {
  rows?: number;
  cols?: number;
};

export function SkeletonRows({ rows = 5, cols = 4 }: SkeletonRowsProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card" aria-busy="true" aria-label="Carregando...">
      {/* Header row */}
      <div className="flex gap-4 border-b bg-muted/30 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="animate-pulse rounded bg-muted h-3.5 flex-1" aria-hidden="true" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b px-4 py-4 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="animate-pulse rounded bg-muted h-4 flex-1"
              style={{ animationDelay: `${(rowIdx * cols + colIdx) * 40}ms` }}
              aria-hidden="true"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
