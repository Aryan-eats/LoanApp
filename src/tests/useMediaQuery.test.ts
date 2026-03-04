import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Minimal MediaQueryList mock
function createMockMediaQueryList(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches,
    media: '',
    onchange: null,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    // Helper to simulate a change event
    _fire(newMatches: boolean) {
      this.matches = newMatches;
      listeners.forEach(cb => cb({ matches: newMatches } as MediaQueryListEvent));
    },
    _listeners: listeners,
  };
}

describe('useMediaQuery hook', () => {
  let mql: ReturnType<typeof createMockMediaQueryList>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mql = createMockMediaQueryList(false);
    // jsdom doesn't define matchMedia, so assign directly
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns initial match value without extra render', () => {
    mql.matches = true;
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when query does not match', () => {
    mql.matches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query fires a change event', () => {
    mql.matches = false;
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      mql._fire(true);
    });
    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(mql.addEventListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('re-evaluates when query prop changes', () => {
    const mqlDesktop = createMockMediaQueryList(true);
    const mqlMobile = createMockMediaQueryList(false);

    window.matchMedia = vi.fn((q: string) => {
      return (q.includes('1024') ? mqlDesktop : mqlMobile) as unknown as MediaQueryList;
    }) as unknown as typeof window.matchMedia;

    const { result, rerender } = renderHook(
      ({ q }) => useMediaQuery(q),
      { initialProps: { q: '(min-width: 1024px)' } }
    );
    expect(result.current).toBe(true);

    rerender({ q: '(min-width: 768px)' });
    expect(result.current).toBe(false);
  });
});
