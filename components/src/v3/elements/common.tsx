import {
  useSchematicI18n,
  useSchematicLocale,
} from "@schematichq/schematic-react";
import React, { useCallback, useSyncExternalStore } from "react";

import { resolveLocale, viewerLocale } from "../model";
import {
  MISSING_STRING,
  defaultString,
  lookup,
  type StringOverrides,
  type Translator,
} from "../strings";

/** Joins class names, skipping empty and false ones. */
export const cx = (...names: (string | undefined | false | null)[]): string =>
  names
    .filter((name): name is string => typeof name === "string" && name !== "")
    .join(" ");

/** Props every element accepts on its root. */
export interface ElementProps {
  className?: string;
  /** BCP 47 tag for number, currency, and date formatting. Defaults to the viewer's language. */
  locale?: string;
  /**
   * Copy for this element by key, overriding both the provider's `strings`
   * and its `translate`. The escape hatch for renaming one string —
   * `strings={{ invoicesHeader: "Receipts" }}` — without an i18n stack.
   */
  strings?: StringOverrides;
}

/** Heading level an element's own heading renders at. Default 2. */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * The locale an element formats in: its own `locale` prop, else the one
 * configured on the provider, else the viewer's. Elements call this rather
 * than `resolveLocale` directly so a provider-level setting reaches every
 * one of them.
 *
 * The viewer's language arrives after hydration, never during the first
 * render. A server has no `navigator` to read, so reading it while rendering
 * would format the server's markup one way and the client's another, and
 * every date and amount would report a hydration mismatch. The server
 * snapshot below is what both renders see; React swaps in the browser's
 * answer once hydration is done. Configure `locale` on the provider to have
 * a server-rendered page match on the first paint.
 */
export function useResolvedLocale(locale?: string): string {
  const configured = useSchematicLocale();
  const viewer = useSyncExternalStore(
    subscribeToNothing,
    viewerLocale,
    noViewerLocale,
  );
  return resolveLocale(locale ?? configured ?? viewer);
}

/** The viewer's language never changes under us, so there is nothing to watch. */
const subscribeToNothing = () => () => {};
/** What a server, and a hydrating client, know about the viewer's language. */
const noViewerLocale = (): undefined => undefined;

/**
 * The elements' copy, resolved against every source a host can configure, in
 * order:
 *
 *   1. `overrides` — the element's own `strings` prop;
 *   2. `strings` on the provider;
 *   3. `translate` on the provider, the host's i18n stack;
 *   4. the element's English default.
 *
 * The request to `translate` carries a sentinel `defaultValue`, so a stack
 * that answers every key with *something* still reports a real miss —
 * `undefined`, the sentinel back, or i18next's bare "echo the key" — and the
 * English default renders instead. `{ count }` and other vars pass straight
 * through, so plurals resolve in the host's stack when it owns the string
 * and under English rules when we do.
 *
 * `onMissingString` fires during render, so it belongs on a logger, not on
 * anything that sets state.
 */
export function useTranslator(
  overrides?: StringOverrides,
  locale?: string,
): Translator {
  const resolved = useResolvedLocale(locale);
  const { onMissingString, strings, translate } = useSchematicI18n();

  return useCallback(
    (key, vars) => {
      // A host's overrides are written in the host's language, so their
      // plural forms are selected under the resolved locale's rules.
      const override =
        lookup(overrides, key, vars, resolved) ??
        lookup(strings, key, vars, resolved);
      if (override !== undefined) {
        return override;
      }

      const fallback = defaultString(key, vars);
      if (translate === undefined) {
        return fallback;
      }

      const translated = translate(key, {
        ...vars,
        defaultValue: MISSING_STRING,
      });
      if (
        translated === undefined ||
        translated === MISSING_STRING ||
        translated === key
      ) {
        onMissingString?.(key);
        return fallback;
      }
      return translated;
    },
    [onMissingString, overrides, resolved, strings, translate],
  );
}

/** A call to action handed off to the host: callback, link, or both. */
export interface CtaProps {
  /** Destination for the CTA when rendered as a link. */
  url?: string;
  /** `target` for the link; defaults to same tab. */
  target?: string;
}

/**
 * Shared loading / error framing so every element degrades the same way.
 * An error only replaces content while there is nothing to show — a failed
 * refetch or page keeps the last good data on screen and reports the
 * failure underneath it.
 *
 * The root's class list never changes: which of the three it is reads from
 * `data-state`, and the skeleton renders inside the card so it keeps the
 * shape the loaded card will have.
 */
export const StatusFrame: React.FC<{
  children: React.ReactNode;
  className: string;
  error: Error | undefined;
  /** Whether the element has data to render despite any error. */
  hasData: boolean;
  isPending: boolean;
  /** Re-runs the failed request. */
  onRetry?: () => void;
  /** The pending state's accessible name, e.g. "Loading invoices". */
  loadingLabel: string;
  /** The retry action's label. */
  retryText: string;
  /**
   * The pending placeholder. An element passes the shape of the card it is
   * about to become — the rows and columns it will actually render — so the
   * load does not resolve from a blank block into a table. The bare
   * container is the fallback for an element that has no shape to promise.
   */
  skeleton?: React.ReactNode;
}> = ({
  children,
  className,
  error,
  hasData,
  isPending,
  loadingLabel,
  onRetry,
  retryText,
  skeleton = <div className="schematic-skeleton" />,
}) => {
  if (error !== undefined && !hasData) {
    return (
      <div className={className} data-state="error">
        <div className="schematic-status" role="alert">
          <span className="schematic-error schematic-status__message">
            {error.message}
          </span>
          {onRetry !== undefined && (
            <button
              className="schematic-link-button schematic-status__retry"
              type="button"
              onClick={onRetry}
            >
              {retryText}
            </button>
          )}
        </div>
      </div>
    );
  }
  if (isPending && !hasData) {
    return (
      <div
        aria-busy="true"
        aria-label={loadingLabel}
        className={className}
        data-state="pending"
        role="status"
      >
        {skeleton}
      </div>
    );
  }
  return (
    <div className={className} data-state="ready">
      {children}
      {error !== undefined && (
        <p className="schematic-status-note schematic-error" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
};
