import { SchematicContext } from "./types";
import { contextString } from "./utils";

/** Header the API reads the HMAC context signature from. */
export const contextSignatureHeader = "X-Schematic-Context-Sig";

/**
 * Refresh a cached signature this many milliseconds before its `exp`, so we
 * never send a signature the server would reject. Matches the server's
 * ±60s clock-skew tolerance (`contextsig.DefaultSkew`).
 */
const refreshSkewMs = 60_000;

/**
 * Function supplied by the integrating application that returns an HMAC context
 * signature (`iat.exp.sig`) for the given context.
 *
 * Because a publishable key is public, the signature must be produced by the
 * customer's backend, which holds the matching secret API key. A typical
 * implementation forwards the context to that backend and returns the
 * `X-Schematic-Context-Sig` value it computes:
 *
 * ```ts
 * const schematic = new Schematic(pubKey, {
 *   getContextSignature: async (context) => {
 *     const res = await fetch("/api/schematic/sign", {
 *       method: "POST",
 *       credentials: "include",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify(context),
 *     });
 *     const { signature } = await res.json();
 *     return signature; // "iat.exp.sig"
 *   },
 * });
 * ```
 *
 * The SDK derives the expiry from the returned string (its middle segment) and
 * caches it per context, so the function is only invoked when no fresh
 * signature is available.
 */
export type ContextSignatureProvider = (
  context: SchematicContext,
) => string | Promise<string>;

/**
 * Parse the expiry (in milliseconds) out of an `iat.exp.sig` signature value.
 * Returns null if the value is not the expected three-part shape or `exp` is
 * not a finite number.
 */
export function parseSignatureExpiryMs(signature: string): number | null {
  const parts = signature.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const expSeconds = Number(parts[1]);
  if (!Number.isFinite(expSeconds)) {
    return null;
  }

  return expSeconds * 1000;
}

type CachedSignature = {
  signature: string;
  expiresAtMs: number;
};

/**
 * Caches HMAC context signatures per context and refreshes them before they
 * expire. A single signature over `{company, user}` covers flag checks, the
 * WebSocket bootstrap, and events, so callers can share one manager across all
 * request paths.
 */
export class ContextSignatureManager {
  private provider: ContextSignatureProvider;
  private debug: (message: string, ...args: unknown[]) => void;
  private cache = new Map<string, CachedSignature>();
  private inFlight = new Map<string, Promise<string | undefined>>();

  constructor(
    provider: ContextSignatureProvider,
    debug: (message: string, ...args: unknown[]) => void,
  ) {
    this.provider = provider;
    this.debug = debug;
  }

  /**
   * Return a valid signature for the given context, fetching a fresh one via
   * the provider when the cache is empty or close to expiry. Concurrent calls
   * for the same context share a single provider invocation. Returns undefined
   * (and logs a warning) if the provider throws, so callers can degrade
   * gracefully by sending the request without a signature.
   */
  async getSignature(
    context: SchematicContext,
  ): Promise<string | undefined> {
    const key = contextString(context);

    const cached = this.cache.get(key);
    if (cached !== undefined && Date.now() < cached.expiresAtMs - refreshSkewMs) {
      return cached.signature;
    }

    const existing = this.inFlight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const pending = this.fetchSignature(key, context).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  }

  /** Drop all cached signatures. */
  clear(): void {
    this.cache.clear();
  }

  private async fetchSignature(
    key: string,
    context: SchematicContext,
  ): Promise<string | undefined> {
    try {
      const signature = await this.provider(context);
      const expiresAtMs = parseSignatureExpiryMs(signature);
      if (expiresAtMs === null) {
        // Unparseable expiry: still use it for this request (let the server
        // decide), but don't cache since we can't tell when it expires.
        this.debug(
          "getContextSignature returned a value without a parseable expiry; not caching",
          { signature },
        );
        return signature;
      }

      this.cache.set(key, { signature, expiresAtMs });
      return signature;
    } catch (error) {
      console.warn("Failed to obtain context signature:", error);
      return undefined;
    }
  }
}
