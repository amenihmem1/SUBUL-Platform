import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-8">
        {/* Header Skeleton */}
        <Skeleton className="h-32 w-full rounded-3xl" />

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
