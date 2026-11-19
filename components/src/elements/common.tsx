import {
  useSchematicI18n,
  useSchematicLocale,
  type BillingResourceName,
} from "@schematichq/schematic-react";
import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { resolveLocale, viewerLocale } from "./model";
import {
  MISSING_STRING,
  defaultString,
  lookup,
  type StringKey,
  type StringOverrides,
  type StringVars,
  type Translator,
} from "./strings";
import { isIconName } from "./styles/icons";

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
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * What an element reads from the billing store, declared on the element so
 * a page can prefetch exactly that. `fetchBillingData` has no default set:
 * each resource is a request on the server, and the set grows with every
 * element, so the page names what it renders.
 */
export interface ReadsBillingResources {
  readonly resources: readonly BillingResourceName[];
}

/**
 * The resource names to prefetch for the elements a page renders, each once:
 *
 * ```ts
 * fetchBillingData(client, { names: billingResources(UpcomingBill, Invoices) });
 * ```
 */
export function billingResources(
  ...elements: ReadsBillingResources[]
): BillingResourceName[] {
  const names: BillingResourceName[] = [];
  for (const element of elements) {
    for (const name of element.resources) {
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

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
      if (isDevelopment) {
        warnRawNumbers(key, vars);
      }
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

const rawNumberWarnings = new Set<string>();

/**
 * Copy interpolates with `String()`, so a number reaches the viewer as
 * "10000" in every locale. Models format counts before they reach a
 * translator; only `count`, which picks the plural form, stays a number.
 */
function warnRawNumbers(key: StringKey, vars: StringVars | undefined): void {
  for (const [name, value] of Object.entries(vars ?? {})) {
    const id = `${key}.${name}`;
    if (
      name !== "count" &&
      typeof value === "number" &&
      !rawNumberWarnings.has(id)
    ) {
      rawNumberWarnings.add(id);
      console.warn(
        `Schematic: "${key}" got a raw number for "${name}"; format it before it reaches the translator.`,
      );
    }
  }
}

/**
 * A feature's or credit's icon as the dashboard sets it: a schematic-icons
 * glyph by name, or anything else, an emoji, drawn as the text it is.
 */
export const Icon: React.FC<{ className?: string; name: string }> = ({
  className,
  name,
}) => {
  // One class either way: the font has no emoji, so the browser draws one
  // from a system font, and only the modifier adds a glyph.
  const glyph = isIconName(name);
  return (
    <i
      aria-hidden="true"
      className={cx(
        "schematic-icon",
        glyph && `schematic-icon--${name}`,
        className,
      )}
    >
      {glyph ? null : name}
    </i>
  );
};

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
export const isDevelopment = ((): boolean => {
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
  const root = cx("schematic-element", className);

  if (error !== undefined && !hasData) {
    return (
      <div className={root} data-state="error">
        <div className="schematic-status" role="alert">
          <span className="schematic-error schematic-status__message">
            {errorMessage ?? error.message}
          </span>
          {onRetry !== undefined && (
            <button
              className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-status__retry"
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
      <div aria-busy="true" className={root} data-state="pending">
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
    <div className={root} data-state="ready">
      {children}
      {error !== undefined && (
        <p className="schematic-status-note schematic-error" role="alert">
          {errorMessage ?? error.message}
        </p>
      )}
    </div>
  );
};

export type TooltipSide = "top" | "bottom";
export type TooltipAlign = "start" | "center" | "end";

export type TooltipProps = {
  children: React.ReactNode;
  className?: string;
  /** The side the content prefers to open on. Default `"top"`. */
  placement?: TooltipSide;
  /**
   * How the content prefers to line up with the trigger: its start or end
   * edge in the text direction, or centred on it. Default `"end"`.
   */
  align?: TooltipAlign;
  /**
   * Flip to the other side or edge when the preferred one would leave the
   * viewport. Default true.
   */
  autoPosition?: boolean;
} & (
  | {
      /** The info glyph's accessible name. */
      label: string;
      trigger?: never;
    }
  | {
      label?: never;
      /**
       * Renders the trigger in place of the info glyph. Spread the id on
       * its `aria-describedby`; the trigger must be focusable.
       */
      trigger: (describedBy: string) => React.ReactNode;
    }
);

/** Space kept between the content and the viewport edge, in px. */
const TOOLTIP_MARGIN = 8;
/** Matches the content's offset from the trigger in styles/tooltip.ts. */
const TOOLTIP_GAP = 8;

export interface TooltipBounds {
  left?: number;
  top?: number;
  width: number;
  height: number;
}

/**
 * The side and edge that keep content of `size` inside `bounds`, keeping
 * the preferred one when it fits and otherwise the one with more room.
 */
export function tooltipPosition(
  rect: { top: number; bottom: number; left: number; right: number },
  size: { width: number; height: number },
  bounds: TooltipBounds,
  preferred: { side: TooltipSide; align: TooltipAlign },
  rtl = false,
): { side: TooltipSide; align: TooltipAlign } {
  const dx = bounds.left ?? 0;
  const dy = bounds.top ?? 0;
  const trigger = {
    top: rect.top - dy,
    bottom: rect.bottom - dy,
    left: rect.left - dx,
    right: rect.right - dx,
  };
  const room: Record<TooltipSide, number> = {
    top: trigger.top - TOOLTIP_GAP - TOOLTIP_MARGIN,
    bottom: bounds.height - trigger.bottom - TOOLTIP_GAP - TOOLTIP_MARGIN,
  };
  const startEdge = rtl ? trigger.right : trigger.left;
  const endEdge = rtl ? trigger.left : trigger.right;
  const spanFrom = (edge: number, towardEnd: boolean) =>
    towardEnd !== rtl
      ? bounds.width - TOOLTIP_MARGIN - edge
      : edge - TOOLTIP_MARGIN;
  const middle = (trigger.left + trigger.right) / 2;
  const span: Record<TooltipAlign, number> = {
    start: spanFrom(startEdge, true),
    center:
      2 *
      Math.min(
        middle - TOOLTIP_MARGIN,
        bounds.width - TOOLTIP_MARGIN - middle,
      ),
    end: spanFrom(endEdge, false),
  };
  const pick = <K extends string>(
    rooms: Record<K, number>,
    want: K,
    other: K,
    needed: number,
  ): K => (rooms[want] >= needed || rooms[want] >= rooms[other] ? want : other);
  return {
    side: pick(
      room,
      preferred.side,
      preferred.side === "top" ? "bottom" : "top",
      size.height,
    ),
    align:
      preferred.align === "center"
        ? span.center >= size.width
          ? "center"
          : pick(span, "end", "start", size.width)
        : pick(
            span,
            preferred.align,
            preferred.align === "end" ? "start" : "end",
            size.width,
          ),
  };
}

/**
 * The part of the window `element` can paint in: an ancestor that clips its
 * overflow cuts off a tooltip as surely as the window edge does.
 */
export function tooltipBounds(element: Element): Required<TooltipBounds> {
  let left = 0;
  let top = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (overflowX === "visible" && overflowY === "visible") {
      continue;
    }
    const box = node.getBoundingClientRect();
    if (overflowX !== "visible") {
      left = Math.max(left, box.left);
      right = Math.min(right, box.right);
    }
    if (overflowY !== "visible") {
      top = Math.max(top, box.top);
      bottom = Math.min(bottom, box.bottom);
    }
  }
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Shows `children` while the trigger is hovered or focused: an info glyph
 * by default, or the caller's own element. The content describes the
 * trigger, so a screen reader reads it on focus.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  align = "end",
  autoPosition = true,
  children,
  className,
  label,
  placement = "top",
  trigger,
}) => {
  const id = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ side: placement, align });
  const [dismissed, setDismissed] = useState(false);

  // Measured as it opens: the content is laid out while hidden, so its
  // size is known before it shows.
  const place = useCallback(() => {
    setDismissed(false);
    const root = rootRef.current;
    const content = contentRef.current;
    if (!autoPosition || root === null || content === null) {
      return;
    }
    setPosition(
      tooltipPosition(
        root.getBoundingClientRect(),
        { width: content.offsetWidth, height: content.offsetHeight },
        tooltipBounds(root),
        { side: placement, align },
        getComputedStyle(root).direction === "rtl",
      ),
    );
  }, [align, autoPosition, placement]);
  const shown = autoPosition ? position : { side: placement, align };

  return (
    <span
      className={cx("schematic-tooltip", className)}
      data-align={shown.align}
      data-placement={shown.side}
      ref={rootRef}
      onFocus={place}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setDismissed(true);
        }
      }}
      onPointerEnter={place}
    >
      {trigger === undefined ? (
        <button
          aria-describedby={id}
          aria-label={label}
          className="schematic-tooltip__trigger"
          type="button"
        >
          <i
            aria-hidden="true"
            className="schematic-icon schematic-icon--info-rounded"
          />
        </button>
      ) : (
        trigger(id)
      )}
      <span
        className="schematic-tooltip__content"
        id={id}
        ref={contentRef}
        role="tooltip"
        style={dismissed ? { visibility: "hidden" } : undefined}
      >
        {children}
      </span>
    </span>
  );
};

/**
 * A modal over the page: a native `<dialog>` opened with `showModal()`, so
 * the browser owns the focus trap, the backdrop, and Escape. It renders
 * nothing while closed, so whatever it holds — a Stripe form — mounts only
 * when it opens. Closing by any route (Escape, the backdrop, the header's
 * control) reaches `onClose`; the owner drops `open` in answer.
 */
export const Dialog: React.FC<{
  children: React.ReactNode;
  className?: string;
  /** The close control's accessible name. */
  closeLabel: string;
  onClose: () => void;
  open: boolean;
  title: string;
  /** The title's id, for a host that labels something else by it. */
  titleId?: string;
}> = ({ children, className, closeLabel, onClose, open, title, titleId }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const generatedId = useId();
  const headingId = titleId ?? generatedId;

  // No cleanup: unmounting removes the element from the top layer without
  // a `close` event. Calling close() here would fire one, and under Strict
  // Mode's mount-unmount-mount that event would reach the owner and shut the
  // dialog the instant it opened.
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog !== null && !dialog.open) {
      dialog.showModal();
    }
  }, [open]);

  if (!open) {
    return null;
  }
  return (
    <dialog
      aria-labelledby={headingId}
      className={cx("schematic-dialog", className)}
      ref={ref}
      onClick={(event) => {
        // The dialog has no padding, so a click on it and not on a child
        // is a click on the backdrop.
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onClose={onClose}
    >
      <div className="schematic-dialog__header">
        <h2 className="schematic-dialog__title" id={headingId}>
          {title}
        </h2>
        <button
          aria-label={closeLabel}
          className="schematic-dialog__close"
          type="button"
          onClick={onClose}
        >
          <i
            aria-hidden="true"
            className="schematic-icon schematic-icon--close"
          />
        </button>
      </div>
      <div className="schematic-dialog__body">{children}</div>
    </dialog>
  );
};
