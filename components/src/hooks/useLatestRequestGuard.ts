import { useCallback, useRef } from "react";

/**
 * Guards against out-of-order async responses ("last response wins" races).
 *
 * Components that fetch on user input or rapidly changing deps can have
 * multiple requests in flight at once; without a guard, whichever response
 * resolves last drives the UI, even if it belongs to a superseded request.
 *
 * Call the returned `beginRequest` when starting a request; it returns an
 * `isStale` function that reports whether a newer request has started since.
 * Skip all state updates (including loading-state resets in `finally`) when
 * `isStale()` is true — the newer request's handlers own the state.
 *
 * ```ts
 * const beginRequest = useLatestRequestGuard();
 *
 * const fetchThing = useCallback(async () => {
 *   const isStale = beginRequest();
 *   setIsLoading(true);
 *   try {
 *     const response = await getThing();
 *     if (isStale()) return;
 *     setThing(response.data);
 *   } finally {
 *     if (!isStale()) {
 *       setIsLoading(false);
 *     }
 *   }
 * }, [beginRequest, getThing]);
 * ```
 */
export function useLatestRequestGuard() {
  const requestIdRef = useRef(0);

  return useCallback(() => {
    const requestId = ++requestIdRef.current;
    return () => requestId !== requestIdRef.current;
  }, []);
}
