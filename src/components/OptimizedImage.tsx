import { cn } from "@/lib/utils";
import { ImgHTMLAttributes, forwardRef, useState, useEffect } from "react";

/**
 * Optimized image component with lazy loading, placeholder, and blur-up effect
 */
export interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Whether to lazy load the image (default: true)
   */
  lazy?: boolean;
  /**
   * Fallback image URL in case of error
   */
  fallbackSrc?: string;
  /**
   * Placeholder blur data URL (base64 encoded low quality image)
   */
  placeholder?: string;
  /**
   * Show a skeleton placeholder while loading
   */
  showSkeleton?: boolean;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({ className, lazy = true, fallbackSrc, placeholder, showSkeleton = false, alt = "", onError, src, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

    useEffect(() => {
      setCurrentSrc(src);
      setIsLoading(true);
      setHasError(false);
    }, [src]);

    const handleLoad = () => {
      setIsLoading(false);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
        setHasError(false);
      } else {
        setHasError(true);
      }
      onError?.(e);
    };

    // Generate a simple placeholder if none provided
    const defaultPlaceholder = placeholder || "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlOSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=";

    return (
      <div className={cn("relative overflow-hidden", className)}>
        {/* Placeholder/Blur-up */}
        {isLoading && placeholder && (
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
            style={{ filter: "blur(10px)", transform: "scale(1.1)" }}
          />
        )}

        {/* Skeleton placeholder */}
        {isLoading && showSkeleton && !placeholder && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        {/* Main image */}
        {!hasError && (
          <img
            ref={ref}
            alt={alt}
            src={currentSrc}
            loading={lazy ? "lazy" : undefined}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              "object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            {...props}
          />
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center text-muted-foreground text-sm">
              <p>Image non disponible</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";
