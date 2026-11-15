export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-line-off ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-line-off bg-surface p-5" aria-hidden>
      <Skeleton className="mb-3 h-6 w-3/4" />
      <Skeleton className="mb-5 h-4 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Завантаження" className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
