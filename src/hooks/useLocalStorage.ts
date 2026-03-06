import { useState, useEffect, useCallback, useRef } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);
  const initialValueRef = useRef(initialValue);

  // Sync ref after render (not during) to satisfy React 19 hook rules
  useEffect(() => {
    initialValueRef.current = initialValue;
  });

  const setValue = useCallback((value: SetValue<T>) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          window.dispatchEvent(new StorageEvent('storage', { key }));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Re-read from localStorage when key changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      } else {
        setStoredValue(initialValueRef.current);
      }
    } catch {
      setStoredValue(initialValueRef.current);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        // Key was removed in another tab
        setStoredValue(initialValueRef.current);
        return;
      }

      // Safely parse the new value
      if (typeof initialValueRef.current === 'string') {
        setStoredValue(event.newValue as unknown as T);
      } else {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          console.warn(`Failed to parse storage event value for key "${key}", falling back to initialValue`);
          setStoredValue(initialValueRef.current);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
