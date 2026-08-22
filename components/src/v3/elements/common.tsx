import React from "react";

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
 * refetch keeps the last good data on screen.
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
  /** Accessible name for the pending skeleton. */
  label: string;
}> = ({ children, className, error, hasData, isPending, label, onRetry }) => {
  if (error !== undefined && !hasData) {
    return (
      <div className={cx(className, "schematic-status")} role="alert">
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
      <div
        aria-busy="true"
        aria-label={`Loading ${label}`}
        className={cx(className, "schematic-skeleton")}
      />
    );
  }
  return <div className={className}>{children}</div>;
};

/**
 * A feature or plan icon: a schematic-icons glyph by name, or the literal
 * text (an emoji) when the name is not in the icon font.
 */
export const Icon: React.FC<{ name: string; className?: string }> = ({
  className,
  name,
}) => {
  const isGlyph = /^[a-z0-9-]+$/.test(name);
  return (
    <i
      aria-hidden="true"
      className={cx("schematic-icon", isGlyph && `icon-${name}`, className)}
    >
      {isGlyph ? null : name}
    </i>
  );
};

/** A usage meter with the three fill states every element shares. */
export const Meter: React.FC<{
  /** 0–100; values above 100 fill the bar. */
  percent: number;
  state: "ok" | "over" | "warning";
  label: string;
}> = ({ label, percent, state }) => (
  <div
    aria-label={label}
    aria-valuemax={100}
    aria-valuemin={0}
    aria-valuenow={Math.min(100, Math.max(0, Math.round(percent)))}
    className={cx("schematic-meter", `schematic-meter--${state}`)}
    role="meter"
  >
    <div
      className="schematic-meter__fill"
      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
    />
  </div>
);

/**
 * Selects and orders rows by an explicit ID list (the `visibleFeatures`
 * props); `undefined` keeps the server order.
 */
export function pickVisible<T>(
  rows: T[],
  ids: string[] | undefined,
  idOf: (row: T) => string,
): T[] {
  if (ids === undefined) {
    return rows;
  }
  const byId = new Map<string, T>();
  for (const row of rows) {
    const id = idOf(row);
    if (!byId.has(id)) {
      byId.set(id, row);
    }
  }
  return ids.flatMap((id) => {
    const match = byId.get(id);
    return match === undefined ? [] : [match];
  });
}

/** Renders a CTA as a link when a URL is given, else as a button. */
export const Cta: React.FC<{
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  target?: string;
  url?: string;
}> = ({ children, className, disabled = false, onClick, target, url }) => {
  const classes = cx("schematic-cta", className);
  if (url !== undefined && !disabled) {
    return (
      <a
        className={classes}
        href={url}
        target={target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      className={classes}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
};
