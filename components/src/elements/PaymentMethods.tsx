import { usePaymentMethods } from "@schematichq/schematic-react";
import { Suspense, lazy, useCallback, useId, useMemo, useState } from "react";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  derivePaymentMethods,
  httpStatus,
  type PaymentMethodRow,
} from "./model";
import type { Translator } from "./strings";

/**
 * Loaded on the first Add: the form pulls in Stripe, which a page that only
 * lists methods never needs.
 */
const PaymentMethodForm = lazy(() => import("./PaymentMethodForm"));

export interface PaymentMethodsProps extends ElementProps {
  /** The Add action and the form behind it. Default true. */
  allowAdd?: boolean;
  /** The Remove and Make default actions on each row. Default true. */
  allowRemove?: boolean;
  /** The "Payment methods" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** A card's expiry beside it. Default true. */
  showExpiration?: boolean;
}

/** Skeleton rows: a company rarely keeps more than a couple of methods. */
const SKELETON_ROWS = 2;

/**
 * The company's saved payment methods. Each row names the method, marks the
 * default, warns of a card about to expire, and offers Make default and
 * Remove; Add opens a Stripe form for a new one, which becomes the default.
 *
 * Which rows can be removed is the server's call: the default cannot go
 * while others exist, and the last method stays on an active subscription.
 * The row's `canRemove` carries that answer, so the element never guesses.
 */
export function PaymentMethods({
  allowAdd = true,
  allowRemove = true,
  className,
  headingLevel = 2,
  locale: localeProp,
  showExpiration = true,
  showHeader = true,
  strings,
}: PaymentMethodsProps) {
  const {
    data: methods,
    error,
    isMutating,
    isPending,
    mutationError,
    refetch,
    remove,
    setDefault,
  } = usePaymentMethods();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [adding, setAdding] = useState(false);
  // The write that last failed, so Retry re-runs it rather than refetching.
  const [lastWrite, setLastWrite] = useState<(() => Promise<void>) | null>(
    null,
  );

  const rows = useMemo(
    () =>
      methods === undefined
        ? undefined
        : derivePaymentMethods(methods, { locale }),
    [locale, methods],
  );

  // A rejected write also lands on `mutationError`, so the rejection here
  // is already reported and only needs catching.
  const write = useCallback((action: () => Promise<void>): Promise<void> => {
    setLastWrite(() => action);
    return action().catch(() => {});
  }, []);

  // The method Stripe just saved becomes the default; a failure there lands
  // under the list like any other write, with the form already closed.
  const saved = useCallback(
    async (paymentMethodId: string) => {
      await write(() => setDefault(paymentMethodId));
      setAdding(false);
    },
    [setDefault, write],
  );

  // A list has no name of its own, so it is labelled by the heading, or by
  // the same text when the header is hidden.
  const headingId = useId();
  const Heading = `h${headingLevel}` as const;

  // A 404 means the account is not enabled for company reads, but "not
  // available" under rows already loaded would contradict itself.
  const unavailable = rows === undefined && httpStatus(error) === 404;
  // Only resolve error copy on failure, or a host's translator would report
  // a missing key on every healthy render.
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("paymentMethodsUnavailable")
        : t("paymentMethodsError");

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-payment-methods", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={rows !== undefined}
      isPending={isPending}
      loadingLabel={t("paymentMethodsLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={
        <PaymentMethodsSkeleton rows={SKELETON_ROWS} showHeader={showHeader} />
      }
    >
      {rows !== undefined && (
        <>
          {(showHeader || allowAdd) && (
            <div className="schematic-header">
              {showHeader && (
                <Heading className="schematic-header__title" id={headingId}>
                  {t("paymentMethodsHeader")}
                </Heading>
              )}
              {allowAdd && (
                <button
                  className="schematic-cta schematic-cta--small schematic-payment-methods__add"
                  disabled={adding}
                  type="button"
                  onClick={() => setAdding(true)}
                >
                  {t("paymentMethodsAdd")}
                </button>
              )}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="schematic-muted schematic-payment-methods__empty">
              {t("paymentMethodsEmpty")}
            </p>
          ) : (
            <ul
              className="schematic-payment-methods__list"
              aria-label={showHeader ? undefined : t("paymentMethodsHeader")}
              aria-labelledby={showHeader ? headingId : undefined}
            >
              {rows.map((row) => (
                <PaymentMethodItem
                  allowRemove={allowRemove}
                  disabled={isMutating}
                  key={row.id}
                  row={row}
                  showExpiration={showExpiration}
                  t={t}
                  onMakeDefault={() =>
                    void write(() => setDefault(row.externalId))
                  }
                  onRemove={() => void write(() => remove(row.id))}
                />
              ))}
            </ul>
          )}
          {adding && (
            <Suspense
              fallback={<FormSkeleton label={t("paymentMethodsFormLoading")} />}
            >
              <PaymentMethodForm
                locale={locale}
                t={t}
                onClose={() => setAdding(false)}
                onSaved={saved}
              />
            </Suspense>
          )}
          {mutationError !== undefined && (
            <p
              className="schematic-status-note schematic-error schematic-payment-methods__write-error"
              role="alert"
            >
              <span className="schematic-payment-methods__write-error-message">
                {mutationError.message}
              </span>
              {lastWrite !== null && (
                <button
                  className="schematic-link-button schematic-payment-methods__write-retry"
                  disabled={isMutating}
                  type="button"
                  onClick={() => void write(lastWrite)}
                >
                  {t("retry")}
                </button>
              )}
            </p>
          )}
        </>
      )}
    </StatusFrame>
  );
}

function PaymentMethodItem({
  allowRemove,
  disabled,
  onMakeDefault,
  onRemove,
  row,
  showExpiration,
  t,
}: {
  allowRemove: boolean;
  disabled: boolean;
  onMakeDefault: () => void;
  onRemove: () => void;
  row: PaymentMethodRow;
  showExpiration: boolean;
  t: Translator;
}) {
  const makeDefault = allowRemove && !row.isDefault;
  const remove = allowRemove && row.canRemove;
  return (
    <li
      className="schematic-payment-methods__row"
      data-brand={row.brand}
      data-default={row.isDefault ? "true" : "false"}
      data-testid="schematic-payment-method"
    >
      <span className="schematic-payment-methods__method">
        <span className="schematic-payment-methods__brand">{row.label}</span>
        {row.last4 !== null && (
          <span className="schematic-payment-methods__last4">
            {t("paymentMethodsLast4", { last4: row.last4 })}
          </span>
        )}
        {row.isDefault && (
          <span className="schematic-badge schematic-payment-methods__default">
            {t("paymentMethodsDefault")}
          </span>
        )}
      </span>
      {showExpiration && row.expiry !== "none" && (
        <span
          className="schematic-small schematic-payment-methods__expires"
          data-expiry={row.expiry}
        >
          {expiryText(row, t)}
        </span>
      )}
      {(makeDefault || remove) && (
        <span className="schematic-payment-methods__actions">
          {makeDefault && (
            <button
              className="schematic-link-button schematic-payment-methods__make-default"
              disabled={disabled}
              type="button"
              onClick={onMakeDefault}
            >
              {t("paymentMethodsMakeDefault")}
            </button>
          )}
          {remove && (
            <button
              className="schematic-link-button schematic-payment-methods__remove"
              disabled={disabled}
              type="button"
              onClick={onRemove}
            >
              {t("paymentMethodsRemove")}
            </button>
          )}
        </span>
      )}
    </li>
  );
}

/** "Expires 08/2027", "Expires soon · 08/2027", or "Expired 08/2025". */
function expiryText(row: PaymentMethodRow, t: Translator): string {
  const vars = { date: row.expiresText };
  switch (row.expiry) {
    case "expired":
      return t("paymentMethodsExpired", vars);
    case "soon":
      return t("paymentMethodsExpiresSoon", vars);
    default:
      return t("paymentMethodsExpires", vars);
  }
}

/**
 * Mirrors the loaded card's shape — a heading bar and a row per method, each
 * with its name on the left and its actions on the right — so the page does
 * not reflow when the rows arrive. The surrounding frame carries the loading
 * label.
 */
function PaymentMethodsSkeleton({
  rows,
  showHeader,
}: {
  rows: number;
  showHeader: boolean;
}) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {Array.from({ length: rows }, (_, row) => (
        <div className="schematic-skeleton__row" key={row}>
          <div className="schematic-skeleton__cell" data-column="method" />
          <div className="schematic-skeleton__cell" data-column="actions" />
        </div>
      ))}
    </div>
  );
}

/** Holds the form's place while its module and Stripe load. */
function FormSkeleton({ label }: { label: string }) {
  return (
    <div
      aria-busy="true"
      className="schematic-payment-methods__form"
      data-state="pending"
    >
      <span className="schematic-hidden">{label}</span>
      <div className="schematic-skeleton">
        <div className="schematic-skeleton__row">
          <div className="schematic-skeleton__cell" data-column="field" />
        </div>
      </div>
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
PaymentMethods.resources = ["paymentMethods"] as const;

export default PaymentMethods;
