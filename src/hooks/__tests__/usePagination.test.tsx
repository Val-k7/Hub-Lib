import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should paginate items correctly with default options', () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3); // 25 items / 10 per page = 3 pages
    expect(result.current.totalItems).toBe(25);
    expect(result.current.currentItems.length).toBe(10);
    expect(result.current.currentItems[0].id).toBe(1);
  });

  it('should use custom itemsPerPage', () => {
    const { result } = renderHook(() =>
      usePagination(items, { itemsPerPage: 5 })
    );

    expect(result.current.totalPages).toBe(5); // 25 items / 5 per page = 5 pages
    expect(result.current.currentItems.length).toBe(5);
  });

  it('should start at custom initial page', () => {
    const { result } = renderHook(() =>
      usePagination(items, { initialPage: 2, itemsPerPage: 10 })
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems[0].id).toBe(11); // Second page starts at item 11
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasNextPage).toBe(true);

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems[0].id).toBe(11);
  });

  it('should navigate to previous page', () => {
    const { result } = renderHook(() =>
      usePagination(items, { initialPage: 2 })
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasPreviousPage).toBe(true);

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.currentItems[0].id).toBe(1);
  });

  it('should not go beyond first page', () => {
    const { result } = renderHook(() => usePagination(items));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should not go beyond last page', () => {
    const { result } = renderHook(() =>
      usePagination(items, { itemsPerPage: 10 })
    );

    // Go to last page
    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.hasNextPage).toBe(false);

    // Try to go further
    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(3); // Should stay at 3
  });

  it('should go to specific page', () => {
    const { result } = renderHook(() => usePagination(items));

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems[0].id).toBe(11);
  });

  it('should clamp page number to valid range', () => {
    const { result } = renderHook(() => usePagination(items));

    act(() => {
      result.current.goToPage(0); // Too low
    });

    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.goToPage(100); // Too high
    });

    expect(result.current.currentPage).toBe(3); // Should clamp to max page
  });

  it('should change items per page', () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.totalPages).toBe(3);

    act(() => {
      result.current.setItemsPerPage(5);
    });

    expect(result.current.totalPages).toBe(5);
    expect(result.current.currentPage).toBe(1); // Should reset to page 1
    expect(result.current.currentItems.length).toBe(5);
  });

  it('should handle empty array', () => {
    const { result } = renderHook(() => usePagination([]));

    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.currentItems.length).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should reset to page 1 when items change and current page is invalid', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, { itemsPerPage: 10 }),
      {
        initialProps: { items },
      }
    );

    // Go to page 3
    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);

    // Reduce items so page 3 doesn't exist
    const fewerItems = items.slice(0, 15);
    rerender({ items: fewerItems });

    // Should reset to page 1
    expect(result.current.currentPage).toBe(1);
  });
});


