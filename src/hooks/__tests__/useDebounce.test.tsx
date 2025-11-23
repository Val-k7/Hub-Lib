import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    expect(result.current).toBe('initial');

    // Change value
    act(() => {
      rerender({ value: 'updated', delay: 300 });
    });

    // Value should still be initial (not debounced yet)
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 'first' },
      }
    );

    // Rapid changes
    act(() => {
      rerender({ value: 'second' });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      rerender({ value: 'third' });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      rerender({ value: 'fourth' });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('fourth');
  });

  it('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    act(() => {
      rerender({ value: 'updated', delay: 500 });
    });

    // Should not update after 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // Should update after 500ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('should handle number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: 0 },
      }
    );

    act(() => {
      rerender({ value: 42 });
    });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it('should handle object values', () => {
    const initialObj = { name: 'initial' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      {
        initialProps: { value: initialObj },
      }
    );

    act(() => {
      rerender({ value: updatedObj });
    });
    
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual(updatedObj);
  });
});

