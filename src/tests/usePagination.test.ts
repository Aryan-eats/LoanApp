import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePagination } from '../hooks/usePagination';

describe('usePagination hook', () => {
  it('falls back to page size 1 for NaN and Infinity', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, initialPageSize: 10, totalItems: 100 })
    );

    act(() => {
      result.current.setPageSize(Number.NaN);
    });

    expect(result.current.pageSize).toBe(1);
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.setPage(4);
      result.current.setPageSize(Number.POSITIVE_INFINITY);
    });

    expect(result.current.pageSize).toBe(1);
    expect(result.current.currentPage).toBe(1);
  });

  it('updates total items and page size atomically when a new page size is provided', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 1, initialPageSize: 10, totalItems: 100 })
    );

    act(() => {
      result.current.setPage(5);
    });

    expect(result.current.currentPage).toBe(5);

    act(() => {
      result.current.setTotalItems(35, 20);
    });

    expect(result.current.totalItems).toBe(35);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPage).toBe(2);
  });

  it('sanitizes non-finite page sizes passed through setTotalItems', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 1, initialPageSize: 10, totalItems: 20 })
    );

    act(() => {
      result.current.setTotalItems(3, Number.POSITIVE_INFINITY);
    });

    expect(result.current.totalItems).toBe(3);
    expect(result.current.pageSize).toBe(1);
    expect(result.current.totalPages).toBe(3);
  });
});
