/** Private identity/data requests must reach Supabase, including within one render.
 * Next's GET request memoization ignores `cache`; an explicit signal opts out.
 * This signal sets no timeout and preserves a caller's cancellation contract.
 */
export const fetchPrivateSupabase: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
    signal:
      init?.signal ??
      (input instanceof Request ? input.signal : new AbortController().signal),
  });
