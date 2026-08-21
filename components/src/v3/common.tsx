import React from "react";

/** Human labels for the display periods, for "/month"-style suffixes. */
export const PERIOD_WORDS: Record<string, string> = {
  month: "month",
  one_time: "one-time",
  quarter: "quarter",
  year: "year",
};

/** Short period labels for "/mo"-style suffixes. */
export const SHORT_PERIODS: Record<string, string> = {
  month: "mo",
  one_time: "once",
  quarter: "qtr",
  year: "yr",
};

/** Joins class names, skipping empty and undefined ones. */
export const cx = (...names: (string | undefined | false)[]): string =>
  names.filter((name): name is string => Boolean(name)).join(" ");

/**
 * Shared loading/error framing so every element degrades the same way.
 * An error only replaces content while there is nothing to show — a failed
 * background refetch keeps the last good data on screen. Errors are never
 * cached by the client, so the retry button re-runs the request.
 */
export const StatusFrame: React.FC<{
  children: React.ReactNode;
  className: string;
  error: Error | undefined;
  /** Whether the element has data to render despite any error. */
  hasData: boolean;
  isPending: boolean;
  /** Re-runs the failed request; renders a retry button when given. */
  onRetry?: () => void;
}> = ({ children, className, error, hasData, isPending, onRetry }) => {
  if (error !== undefined && !hasData) {
    return (
      <div className={className} role="alert">
        <span className="schematic-error">{error.message}</span>
        {onRetry !== undefined && (
          <button
            className="schematic-link-button"
            type="button"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  if (isPending && !hasData) {
    return (
      <div aria-busy="true" className={cx(className, "schematic-skeleton")}>
        <span className="schematic-muted">Loading…</span>
      </div>
    );
  }
  return <div className={className}>{children}</div>;
};

/**
 * Selects and orders rows by an explicit ID list, matching each ID to its
 * row via a single pass. Used by the visibleFeatures props.
 */
export const pickVisible = <T,>(
  rows: T[],
  ids: string[] | undefined,
  idOf: (row: T) => string | undefined,
): T[] => {
  if (ids === undefined) {
    return rows;
  }
  const byId = new Map<string, T>();
  for (const row of rows) {
    const id = idOf(row);
    if (id !== undefined && !byId.has(id)) {
      byId.set(id, row);
    }
  }
  return ids.flatMap((id) => {
    const match = byId.get(id);
    return match !== undefined ? [match] : [];
  });
};
