import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from '../hooks/useLocalStorage';

describe('useLocalStorage hook', () => {
  const TEST_KEY = 'test-key';

  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('reads existing value from localStorage', () => {
    window.localStorage.setItem(TEST_KEY, JSON.stringify('persisted'));
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));
    expect(result.current[0]).toBe('persisted');
  });

  it('writes value to localStorage via setValue', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'a'));

    act(() => {
      result.current[1]('b');
    });

    expect(result.current[0]).toBe('b');
    expect(JSON.parse(window.localStorage.getItem(TEST_KEY)!)).toBe('b');
  });

  it('supports updater function in setValue', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 10));

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);
  });

  it('removes value from localStorage via removeValue', () => {
    window.localStorage.setItem(TEST_KEY, JSON.stringify('existing'));
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'fallback'));

    act(() => {
      result.current[2](); // removeValue
    });

    expect(result.current[0]).toBe('fallback');
    expect(window.localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('updates state when key prop changes', () => {
    window.localStorage.setItem('key-a', JSON.stringify('val-a'));
    window.localStorage.setItem('key-b', JSON.stringify('val-b'));

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage(key, 'default'),
      { initialProps: { key: 'key-a' } }
    );
    expect(result.current[0]).toBe('val-a');

    rerender({ key: 'key-b' });
    expect(result.current[0]).toBe('val-b');
  });

  it('handles objects as values', () => {
    const initial = { name: 'test', count: 0 };
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, initial));

    act(() => {
      result.current[1]({ name: 'updated', count: 1 });
    });

    expect(result.current[0]).toEqual({ name: 'updated', count: 1 });
    expect(JSON.parse(window.localStorage.getItem(TEST_KEY)!)).toEqual({ name: 'updated', count: 1 });
  });
});
