import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ResourceCard } from "@/components/ResourceCard";
import { Resource } from "@/hooks/useResources";

interface VirtualResourceListProps {
  resources: Resource[];
  estimateSize?: number;
}

/**
 * Virtual scrolling component for resource lists
 * Only renders visible items for optimal performance
 */
export const VirtualResourceList = ({ 
  resources, 
  estimateSize = 300 
}: VirtualResourceListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: resources.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 3, // Render 3 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-300px)] overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const resource = resources[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-4 py-3"
            >
              <ResourceCard
                id={resource.id}
                title={resource.title}
                description={resource.description}
                author={
                  resource.profiles.username ||
                  resource.profiles.full_name ||
                  "Anonyme"
                }
                authorUsername={resource.profiles.username || undefined}
                category={resource.category}
                tags={resource.tags}
                resourceType={resource.resource_type}
                averageRating={resource.average_rating}
                ratingsCount={resource.ratings_count}
                downloads={resource.downloads_count}
                views={resource.views_count}
                lastUpdated={new Date(resource.updated_at).toLocaleDateString("fr-FR")}
                visibility={resource.visibility as any}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
