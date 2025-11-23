import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Resource card skeleton
 */
export const ResourceCardSkeleton = () => {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
      
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </Card>
  );
};

/**
 * Grid of resource card skeletons
 */
export const ResourceGridSkeleton = ({ count = 6 }: { count?: number }) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
    </div>
  );
};

/**
 * List of skeletons
 */
export const ListSkeleton = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
};

/**
 * Profile skeleton
 */
export const ProfileSkeleton = () => {
  return (
    <Card className="p-8 space-y-6">
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-16 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-16 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-16 mx-auto" />
        </div>
      </div>
    </Card>
  );
};

/**
 * Detail page skeleton
 */
export const DetailPageSkeleton = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
      </div>
      
      <div className="flex gap-3">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
      
      <Card className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
      
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
};

/**
 * Table skeleton
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-12" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Full page loading spinner
 */
export const PageLoader = ({ message = "Chargement..." }: { message?: string }) => {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
};

/**
 * Inline loader
 */
export const InlineLoader = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3"
  };
  
  return (
    <div className={`rounded-full border-primary border-t-transparent animate-spin ${sizeClasses[size]}`} />
  );
};
