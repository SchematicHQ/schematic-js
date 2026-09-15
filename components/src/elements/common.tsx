import {
  useSchematicI18n,
  useSchematicLocale,
} from "@schematichq/schematic-react";
import React, { useCallback, useSyncExternalStore } from "react";

import { resolveLocale, viewerLocale } from "./model";
import {
  MISSING_STRING,
  defaultString,
  lookup,
  type StringOverrides,
  type Translator,
} from "./strings";

export const cx = (...names: (string | undefined | false | null)[]): string =>
  names
    .filter((name): name is string => typeof name === "string" && name !== "")
    .join(" ");

/** Props every element accepts on its root. */
export interface ElementProps {
  className?: string;
  /** BCP 47 tag for number, currency, and date formatting. Defaults to the viewer's language. */
  locale?: string;
  /** Overrides the provider's `strings` and its `translate`. */
  strings?: StringOverrides;
}

/** Heading level an element's own heading renders at. Default 2. */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * The element's `locale` prop, else the provider's, else the viewer's.
 *
 * The viewer's language arrives after hydration, never during the first
 * render: a server has no `navigator`, so reading it while rendering would
 * make every date and amount report a hydration mismatch. Configure `locale`
 * on the provider to have a server-rendered page match on first paint.
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

/** Never changes under us, so there is nothing to watch. */
const subscribeToNothing = () => () => {};
/** What a server, and a hydrating client, know about the viewer's language. */
const noViewerLocale = (): undefined => undefined;

/**
 * Copy resolved in order: the element's `strings`, the provider's `strings`,
 * the provider's `translate`, then the English default.
 *
 * The request to `translate` carries a sentinel `defaultValue`, so a stack
 * that answers every key with *something* still reports a real miss —
 * `undefined`, the sentinel back, or i18next's bare key echo.
 *
 * `onMissingString` fires during render, so it belongs on a logger.
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
 * An error only replaces content while there is nothing to show: a failed
 * refetch keeps the last good data and reports the failure underneath it.
 * The root's class list never changes — which state it is in reads from
 * `data-state`.
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
  /** The shape the card is about to become, so a load does not resolve
   * from a blank block into a table. */
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
      <div aria-busy="true" className={className} data-state="pending">
        {/* Stated, not announced. A `role="status"` here would promise an
            announcement that never comes: the region is unmounted the moment
            the rows arrive, and removing a live region says nothing — so a
            reader heard "Loading invoices" and then silence. Announcing the
            arrival is worth doing and is not this: it needs a live region
            that outlives the load, and a decision about what every element
            should say when it finishes. Until then the label is here to be
            read by anyone who navigates to it. */}
        <span className="schematic-hidden">{loadingLabel}</span>
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
