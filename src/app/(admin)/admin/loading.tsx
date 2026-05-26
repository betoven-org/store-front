export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="size-2.5 animate-pulse rounded-full bg-muted-foreground/30" style={{ animationDelay: "0ms" }} />
          <div className="size-2.5 animate-pulse rounded-full bg-muted-foreground/30" style={{ animationDelay: "150ms" }} />
          <div className="size-2.5 animate-pulse rounded-full bg-muted-foreground/30" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
