import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/80 via-orange-50 to-yellow-50" />
        <div className="relative max-w-5xl mx-auto px-6 py-16 lg:py-24 text-center">
          <Skeleton className="w-20 h-20 rounded-2xl mx-auto mb-6 bg-amber-200/50" />
          <Skeleton className="h-12 w-48 mx-auto mb-3 bg-amber-200/50" />
          <Skeleton className="h-5 w-64 mx-auto bg-amber-200/50" />
        </div>
      </section>

      {/* Stats skeleton */}
      <section className="max-w-5xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 rounded-2xl p-5 text-center">
              <Skeleton className="w-10 h-10 rounded-xl mx-auto mb-2 bg-amber-200/50" />
              <Skeleton className="h-8 w-12 mx-auto mb-1 bg-amber-200/50" />
              <Skeleton className="h-4 w-16 mx-auto bg-amber-200/50" />
            </div>
          ))}
        </div>
      </section>

      {/* Quick actions skeleton */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <Skeleton className="h-6 w-24 mb-6 bg-amber-200/50" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-amber-100/50" />
          ))}
        </div>
      </section>
    </div>
  );
}
