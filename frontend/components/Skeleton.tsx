export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
  );
}

export function SkeletonText({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded h-4 ${className}`} />;
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="animate-pulse bg-gray-200 rounded h-4 w-1/3" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-50 flex items-center gap-4">
          <div className="animate-pulse bg-gray-200 rounded h-4 w-1/4" />
          <div className="animate-pulse bg-gray-200 rounded h-4 w-1/6" />
          <div className="animate-pulse bg-gray-200 rounded-full h-6 w-16" />
          <div className="flex-1" />
          <div className="animate-pulse bg-gray-200 rounded h-4 w-1/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-28" />
      ))}
    </div>
  );
}
