import { useState, useMemo } from "react";

export interface UsePaginationOptions {
  itemsPerPage?: number;
  initialPage?: number;
}

export interface UsePaginationReturn<T> {
  currentItems: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setItemsPerPage: (items: number) => void;
}

/**
 * Hook pour la pagination côté client
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { itemsPerPage: initialItemsPerPage = 10, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const totalItems = items.length;

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Réinitialiser à la page 1 si le nombre d'items change
  useMemo(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentItems,
    currentPage,
    totalPages,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    setItemsPerPage: (items: number) => {
      setItemsPerPage(items);
      setCurrentPage(1); // Reset to first page when changing items per page
    },
  };
}




