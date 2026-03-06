import { useState, useEffect, useCallback, useRef } from 'react';
import { isRequestCancellationError, parseApiError } from '../utils/parseApiError';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface FetchOptions<T> {
  immediate?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface FetchReturn<T> extends FetchState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

type FetchFn<T> = (signal?: AbortSignal) => Promise<T>;

export function useFetch<T>(
  fetchFn: FetchFn<T>,
  options: FetchOptions<T> = {}
): FetchReturn<T> {
  const {
    immediate = true,
    initialData = null,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: initialData,
    loading: immediate,
    error: null,
  });

  const isMounted = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const abortControllersRef = useRef<Set<AbortController>>(new Set());

  useEffect(() => {
    fetchFnRef.current = fetchFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const execute = useCallback(async (): Promise<T | null> => {
    const controller = new AbortController();
    abortControllersRef.current.add(controller);

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await fetchFnRef.current(controller.signal);

      if (isMounted.current && !controller.signal.aborted) {
        setState({ data: result, loading: false, error: null });
        onSuccessRef.current?.(result);
      }

      return result;
    } catch (error) {
      if (controller.signal.aborted || isRequestCancellationError(error)) {
        if (isMounted.current) {
          setState((prev) => ({ ...prev, loading: false }));
        }
        return null;
      }

      const errorMessage = parseApiError(error);

      if (isMounted.current) {
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        onErrorRef.current?.(errorMessage);
      }

      return null;
    } finally {
      abortControllersRef.current.delete(controller);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    if (immediate) {
      void execute();
    }
  }, [immediate, execute]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}

export default useFetch;
