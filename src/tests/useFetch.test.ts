import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFetch } from '../hooks/useFetch';

describe('useFetch hook', () => {
  it('starts with loading=true when immediate is true', () => {
    const fetchFn = () => new Promise(() => {});
    const { result } = renderHook(() => useFetch(fetchFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('does not auto-fetch when immediate is false', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useFetch(fetchFn, { immediate: false }));

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.execute();
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('fetches data successfully', async () => {
    const mockData = { message: 'success' };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useFetch(fetchFn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('returns null and sets error when fetch fails', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useFetch(fetchFn, { immediate: false }));
    let value: unknown;
    await act(async () => {
      value = await result.current.execute();
    });

    expect(value).toBeNull();
    await waitFor(() => {
      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.loading).toBe(false);
    });
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useFetch(fetchFn, { onSuccess }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
  });

  it('calls onError callback', async () => {
    const onError = vi.fn();
    const fetchFn = vi.fn().mockRejectedValue(new Error('Boom'));

    const { result } = renderHook(() => useFetch(fetchFn, { onError }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(onError).toHaveBeenCalledWith('Boom');
  });

  it('supports setData and reset', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ count: 1 });

    const { result } = renderHook(() => useFetch(fetchFn, { initialData: { count: 0 }, immediate: false }));

    act(() => {
      result.current.setData({ count: 3 });
    });
    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 3 });
    });

    act(() => {
      result.current.reset();
    });
    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 0 });
      expect(result.current.error).toBeNull();
    });
  });
});
