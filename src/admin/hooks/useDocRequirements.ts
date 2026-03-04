/**
 * useDocRequirements – fetches document requirements for a loan code from the API.
 *
 * Uses the cached `/api/documents/req-docs/flat` endpoint and keeps an
 * in-memory Map so repeated lookups for the same loan code never re-fetch.
 * Falls back to the minimal static seed in DocsReq.ts when the API is
 * unavailable or the loan code is empty.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getFlatDocRequirements } from '../../api/reqDocApi';
import type { FlatDocRequirement } from '../../api/reqDocApi';
import { FALLBACK_DOCS } from '../../data/DocsReq';

export type { FlatDocRequirement as DocumentRequirement };

// Module-level cache shared across hook instances (survives re-renders).
const docCache = new Map<string, FlatDocRequirement[]>();

// Cast once – DocsReq.DocumentRequirement and FlatDocRequirement are structurally identical;
// the only difference is the optional modifier on `description`.
const FALLBACK = FALLBACK_DOCS as FlatDocRequirement[];

export function useDocRequirements(loanCode: string, lenderCode?: string) {
  const [docs, setDocs] = useState<FlatDocRequirement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loanCode) {
      setDocs([]);
      return;
    }

    // Cache key includes lenderCode so bank-specific results are cached separately
    const cacheKey = lenderCode ? `${lenderCode}:${loanCode}` : loanCode;

    // Hit memory cache first
    const cached = docCache.get(cacheKey);
    if (cached) {
      setDocs(cached);
      return;
    }

    // Fetch from API
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let active = true;
    setIsLoading(true);

    getFlatDocRequirements(loanCode, lenderCode)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data && res.data.length > 0) {
          docCache.set(cacheKey, res.data);
          setDocs(res.data);
        } else {
          // API returned empty - use fallback
          setDocs(FALLBACK);
        }
      })
      .catch(() => {
        if (!active) return;
        // Network/auth error - use static fallback
        setDocs(FALLBACK);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [loanCode, lenderCode]);

  /** Imperatively get docs for a loan code (for callbacks/handlers). */
  const getDocsForLoanCode = useCallback(
    async (code: string, bankCode?: string): Promise<FlatDocRequirement[]> => {
      if (!code) return FALLBACK;

      const cacheKey = bankCode ? `${bankCode}:${code}` : code;
      const cached = docCache.get(cacheKey);
      if (cached) return cached;

      try {
        const res = await getFlatDocRequirements(code, bankCode);
        if (res.success && res.data && res.data.length > 0) {
          docCache.set(cacheKey, res.data);
          return res.data;
        }
      } catch {
        // fall through
      }
      return FALLBACK;
    },
    [],
  );

  return { docs, isLoading, getDocsForLoanCode };
}
