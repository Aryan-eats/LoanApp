import { useState, useEffect, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface FetchOptions<T> {
  immediate?: boolean;        // Fetch on mount (default: true)
  initialData?: T | null;     // Initial data value
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface FetchReturn<T> extends FetchState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: FetchOptions<T> = {}
): FetchReturn<T> {
  const { 
    immediate = true, 
    initialData = null,
    onSuccess,
    onError 
  } = options;







  const [state, setState] = useState<FetchState<T>>({
    data: initialData,
    loading: immediate,
    error: null,
  });

  const isMounted = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  // Store callbacks in refs to keep execute's identity stable
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await fetchFnRef.current();
      
      if (isMounted.current) {
        setState({ data: result, loading: false, error: null });
        onSuccessRef.current?.(result);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof AxiosError 
        ? err.response?.data?.message || err.message
        : err instanceof Error 
          ? err.message 
          : 'An error occurred';

      if (isMounted.current) {
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        onErrorRef.current?.(errorMessage);
      }
      
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  useEffect(() => {
    // @Aryan - I noticed we were getting memory leaks when switching tabs fast. 
    // Added this cleanup because the 'isMounted' ref wasn't enough on its own.
    return () => {
      isMounted.current = false;
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
