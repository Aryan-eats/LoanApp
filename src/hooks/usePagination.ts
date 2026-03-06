import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PaginationActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number, newPageSize?: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  reset: () => void;
}

export type UsePaginationReturn = PaginationState & PaginationActions;

const sanitizePageSize = (size: number): number => {
  if (!Number.isFinite(size) || size < 1) {
    return 1;
  }

  return Math.floor(size);
};

const getTotalPages = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / pageSize));

export function usePagination(options: PaginationOptions = {}): UsePaginationReturn {
  const { 
    initialPage = 1, 
    initialPageSize: rawInitialPageSize = 10, 
    totalItems: initialTotal = 0 
  } = options;

  const validatedInitialPageSize = sanitizePageSize(rawInitialPageSize);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(validatedInitialPageSize);
  const [totalItems, setTotalItemsState] = useState(initialTotal);

  const totalPages = useMemo(() => getTotalPages(totalItems, pageSize), [totalItems, pageSize]);

  const startIndex = useMemo(() => 
    (currentPage - 1) * pageSize, 
    [currentPage, pageSize]
  );

  const endIndex = useMemo(() => 
    Math.min(startIndex + pageSize, totalItems), 
    [startIndex, pageSize, totalItems]
  );

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Keep a ref for totalPages so setPage always clamps against the latest value
  const totalPagesRef = useRef(totalPages);
  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  const setPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPagesRef.current));
    setCurrentPage(validPage);
  }, []);

  const setPageSize = useCallback((size: number) => {
    const nextPageSize = sanitizePageSize(size);
    setPageSizeState(nextPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const setTotalItems = useCallback((total: number, newPageSize?: number) => {
    const nextPageSize =
      newPageSize === undefined ? pageSize : sanitizePageSize(newPageSize);

    setTotalItemsState(total);

    if (newPageSize !== undefined) {
      setPageSizeState(nextPageSize);
    }

    // Clamp currentPage if it's now out of range
    setCurrentPage(prev => {
      const newTotalPages = getTotalPages(total, nextPageSize);
      return prev > newTotalPages ? newTotalPages : prev;
    });
  }, [pageSize]);

  const nextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage(p => p + 1);
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) setCurrentPage(p => p - 1);
  }, [hasPrevPage]);

  const firstPage = useCallback(() => setCurrentPage(1), []);
  
  const lastPage = useCallback(() => setCurrentPage(totalPages), [totalPages]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSizeState(validatedInitialPageSize);
  }, [initialPage, validatedInitialPageSize]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
    setPage,
    setPageSize,
    setTotalItems,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    reset,
  };
}

export default usePagination;
