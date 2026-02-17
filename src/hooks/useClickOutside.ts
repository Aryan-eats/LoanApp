import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      if (ref.current && !ref.current.contains(target)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler]);

  return ref;
}

export default useClickOutside;
