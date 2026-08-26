export interface SavingsListRowSkeletonProps {
  className?: string;
}

/**
 * Placeholder shown in place of a single savings list row while its data
 * is being fetched.
 */
export default function SavingsListRowSkeleton({
  className = "",
}: SavingsListRowSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading item"
      className={`flex animate-pulse items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/5" />
        <div>
          <div className="h-3 w-28 rounded bg-white/5" />
          <div className="mt-2 h-2 w-16 rounded bg-white/5" />
        </div>
      </div>
      <div className="h-3 w-16 rounded bg-white/5" />
      <span className="sr-only">Loading item</span>
    </div>
  );
}

export interface SavingsListSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * A stack of `SavingsListRowSkeleton` rows, for use while a savings list
 * is being fetched.
 */
export function SavingsListSkeleton({
  rows = 4,
  className = "",
}: SavingsListSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading list"
      className={`space-y-2 ${className}`}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <SavingsListRowSkeleton key={index} />
      ))}
    </div>
  );
}
