import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface PrefetchLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  to: string;
  queryKey?: any[];
  queryFn?: () => Promise<any>;
  children: React.ReactNode;
}

/**
 * Enhanced Link component with intelligent prefetching on hover
 * Automatically prefetches data when user hovers over the link
 */
export const PrefetchLink = ({ 
  to, 
  queryKey, 
  queryFn, 
  children, 
  className,
  ...props 
}: PrefetchLinkProps) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    if (queryKey && queryFn) {
      // Prefetch the data when user hovers
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      });
    }
  };

  return (
    <Link
      to={to}
      onMouseEnter={handleMouseEnter}
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
};
