/**
 * Fixtures shared by the billing specs. Not exported from the package: both
 * specs drive the same transport from different heights, and a copy each is
 * a copy that drifts.
 */

import { vi } from "vitest";

export type Call = { url: string; headers: Record<string, string> };

export function fakeFetch(
  respond: (
    url: string,
    headers: Record<string, string>,
  ) => {
    status?: number;
    body?: unknown;
  } = () => ({}),
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, headers });
      const { status = 200, body = { ok: true } } = respond(url, headers);
      // A 204 may not carry a body, even an empty one; `body: null` on any
      // other status is an empty body, which is how a malformed 200 reads.
      const raw = body === null ? "" : JSON.stringify(body);
      return new Response(status === 204 ? null : raw, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

/** The credential each call carried, in order. */
export const tokens = (calls: Call[]): string[] =>
  calls.map((call) => call.headers["X-Schematic-Api-Key"]);
