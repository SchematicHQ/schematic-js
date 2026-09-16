import {
  useSchematicI18n,
  useSchematicLocale,
} from "@schematichq/schematic-react";
import React, { useCallback, useEffect, useSyncExternalStore } from "react";

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
  /** BCP 47 tag for number, currency, and date formatting. Overrides the
   * provider's `locale`; without either, the viewer's language, else `en-US`. */
  locale?: string;
  /** Overrides the provider's `strings` and its `translate`. */
  strings?: StringOverrides;
}

/** Heading level an element's own heading renders at. Default 2. */
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * The element's `locale` prop, else the provider's, else the viewer's.
 *
 * The viewer's language is left out of a server render and its hydration,
 * or every formatted date and amount would mismatch. Set `locale` on the
 * provider for a server-rendered page to match on first paint.
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

/** The viewer's language is treated as fixed, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};
/** Server snapshot: the viewer's language is unknown until after hydration. */
const noViewerLocale = (): undefined => undefined;

/**
 * Resolves copy in order: the element's `strings`, the provider's `strings`,
 * the provider's `translate`, then the English default.
 *
 * `translate` is called with a sentinel `defaultValue` so a miss is
 * detectable even from an i18next stack that answers every key: `undefined`,
 * the sentinel, or the bare key echoed back all count as misses.
 *
 * `onMissingString` fires during render, so keep it to logging.
 */
export function useTranslator(
  overrides?: StringOverrides,
  locale?: string,
): Translator {
  const resolved = useResolvedLocale(locale);
  const { onMissingString, strings, translate } = useSchematicI18n();

  return useCallback(
    (key, vars) => {
      // Host overrides are in the host's language, so their plural forms
      // follow the resolved locale rather than English.
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

/** Where a call to action rendered as a link goes. */
export interface CtaProps {
  url?: string;
  /** `target` for the link. */
  target?: string;
}

/**
 * The host's bundler replaces `process.env.NODE_ENV`. Where nothing does,
 * the read can throw, and that counts as production: silence is the safe
 * default for a dev-only log.
 */
const isDevelopment = ((): boolean => {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
})();

/**
 * A fixed message hides the error that says what actually went wrong (a
 * missing provider, a 404, a CORS refusal). Log it in development so a
 * mis-wired page is diagnosable from the console. Production stays quiet;
 * the host can read the error from the hook.
 */
function useReportHiddenError(
  error: Error | undefined,
  errorMessage: string | undefined,
): void {
  useEffect(() => {
    if (isDevelopment && error !== undefined && errorMessage !== undefined) {
      console.error(`Schematic: ${errorMessage}`, error);
    }
  }, [error, errorMessage]);
}

/**
 * An error only replaces content when there is nothing to show; a failed
 * refetch keeps the last good data and reports the failure beneath it. The
 * root's class list is stable across states, and `data-state` says which.
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
  /** Shown instead of the error's own message, which is then logged in
   * development. */
  errorMessage?: string;
  /** Visually hidden text for the pending state, e.g. "Loading invoices". */
  loadingLabel: string;
  /** The retry action's label. */
  retryText: string;
  /** Placeholder shaped like the loaded content, so the load does not
   * reflow the page. */
  skeleton?: React.ReactNode;
}> = ({
  children,
  className,
  error,
  errorMessage,
  hasData,
  isPending,
  loadingLabel,
  onRetry,
  retryText,
  skeleton = <div className="schematic-skeleton" />,
}) => {
  useReportHiddenError(error, errorMessage);

  if (error !== undefined && !hasData) {
    return (
      <div className={className} data-state="error">
        <div className="schematic-status" role="alert">
          <span className="schematic-error schematic-status__message">
            {errorMessage ?? error.message}
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
        {/* Not a live region: this node unmounts when the rows arrive, and
            removing a live region announces nothing, so `role="status"` would
            promise a completion announcement that never comes. Announcing
            arrival needs a region that outlives the load. */}
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
          {errorMessage ?? error.message}
        </p>
      )}
    </div>
  );
};
