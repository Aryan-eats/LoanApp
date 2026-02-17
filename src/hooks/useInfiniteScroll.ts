import { useState, useEffect, useRef, useCallback } from 'react';
import type { RefObject } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;      // Distance from bottom to trigger (in pixels)
  hasMore: boolean;        // Whether there's more data to load
  loading: boolean;        // Current loading state
  onLoadMore: () => void;  // Function to load more data
}

interface UseInfiniteScrollReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  sentinelRef: RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn {
  // Developer Note: Using IntersectionObserver sentinel instead of scroll listeners.
  // Much better for performance on mobile devices. Don't change this back to window.scroll!
  const { threshold = 100, hasMore, loading, onLoadMore } = options;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sentinelRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore, threshold]);

  return { containerRef, sentinelRef };
}

export function useScrollPosition(elementRef: RefObject<HTMLElement | null>) {
  const [scrollPosition, setScrollPosition] = useState({
    x: 0,
    y: 0,
    isAtTop: true,
    isAtBottom: false,
    scrollHeight: 0,
    clientHeight: 0,
  });

  const handleScroll = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    const { scrollTop, scrollLeft, scrollHeight, clientHeight } = element;
    
    setScrollPosition({
      x: scrollLeft,
      y: scrollTop,
      isAtTop: scrollTop === 0,
      isAtBottom: scrollTop + clientHeight >= scrollHeight - 1,
      scrollHeight,
      clientHeight,
    });
  }, [elementRef]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial position

    return () => element.removeEventListener('scroll', handleScroll);
  }, [elementRef, handleScroll]);

  return scrollPosition;
}

export default useInfiniteScroll;
