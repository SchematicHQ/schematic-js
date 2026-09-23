import { usePaymentMethods } from "@schematichq/schematic-react";
import React, { Suspense, lazy, useCallback, useMemo, useState } from "react";

import {
  Dialog,
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
  type DerivedPaymentMethods,
  type PaymentMethodLabel,
  type PaymentMethodRow,
} from "./model";
import type { Translator } from "./strings";

/**
 * Loaded on the first Add: the form pulls in Stripe, which a page that only
 * shows the method on file never needs.
 */
const PaymentMethodForm = lazy(() => import("./PaymentMethodForm"));

export interface PaymentMethodsProps extends ElementProps {
  /** The Edit (or Add) action and the dialog behind it. Default true. */
  allowEdit?: boolean;
  /** The "Payment details" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** The header's warning when the default card is about to expire. Default true. */
  showExpiration?: boolean;
}

/** What the dialog shows: the method on file, or the form for a new one. */
type DialogView = "current" | "add";

/**
 * The company's payment method on file, the embed's way: a pill naming the
 * default, an expiry warning beside the heading, and an Edit that opens a
 * dialog where the other saved methods can be made the default or removed
 * and a new one added through Stripe.
 *
 * The pill offers no Remove. The server refuses to remove the default while
 * others exist and the last method on a subscription, so a Remove there
 * would always fail; removal lives on the other rows in the dialog, where
 * the server's `canRemove` decides which offer it.
 */
export function PaymentMethods({
  allowEdit = true,
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
  // Null while the dialog is closed.
  const [dialog, setDialog] = useState<DialogView | null>(null);
  const [choosing, setChoosing] = useState(false);
  // The write that last failed, so Retry re-runs it rather than refetching;
  // also whether this dialog session has written at all, which is what
  // decides whether a `mutationError` is its to show.
  const [lastWrite, setLastWrite] = useState<(() => Promise<void>) | null>(
    null,
  );

  const derived = useMemo(
    () =>
      methods === undefined
        ? undefined
        : derivePaymentMethods(methods, { locale }),
    [locale, methods],
  );

  // A rejected write also lands on `mutationError`, so the rejection here
  // is already reported and only needs catching. A write that lands leaves
  // the dialog on the refreshed method, the other rows folded away.
  const write = useCallback(async (action: () => Promise<void>) => {
    setLastWrite(() => action);
    try {
      await action();
      setDialog("current");
      setChoosing(false);
    } catch {
      // Reported through `mutationError`.
    }
  }, []);

  // The method Stripe just saved becomes the default. Stripe has already
  // kept it, so a failure here is a failed write to retry from the method
  // view, not a form to resubmit.
  const saved = useCallback(
    async (paymentMethodId: string) => {
      await write(() => setDefault(paymentMethodId));
      setDialog("current");
      setChoosing(false);
    },
    [setDefault, write],
  );

  const open = useCallback(() => {
    setLastWrite(null);
    setChoosing(false);
    setDialog("current");
  }, []);
  const close = useCallback(() => setDialog(null), []);

  const Heading = `h${headingLevel}` as const;

  // A 404 means the account is not enabled for company reads, but "not
  // available" over a method already loaded would contradict itself.
  const unavailable = derived === undefined && httpStatus(error) === 404;
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
      hasData={derived !== undefined}
      isPending={isPending}
      loadingLabel={t("paymentMethodsLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<PaymentMethodsSkeleton showHeader={showHeader} />}
    >
      {derived !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title">
                {t("paymentMethodsHeader")}
              </Heading>
              {showExpiration && derived.expiryWarning !== "none" && (
                <span
                  className="schematic-small schematic-payment-methods__expiry-warning"
                  data-expiry={derived.expiryWarning}
                >
                  {expiryWarningText(derived, t)}
                </span>
              )}
            </div>
          )}
          <MethodPill row={derived.current} t={t}>
            {allowEdit && (
              <button
                className="schematic-link-button schematic-payment-methods__edit"
                type="button"
                onClick={open}
              >
                {derived.current === null
                  ? t("paymentMethodsAdd")
                  : t("paymentMethodsEdit")}
              </button>
            )}
          </MethodPill>
          {dialog !== null && (
            <PaymentMethodsDialog
              choosing={choosing}
              derived={derived}
              isMutating={isMutating}
              locale={locale}
              mutationError={lastWrite === null ? undefined : mutationError}
              t={t}
              view={dialog}
              onChoose={() => setChoosing((was) => !was)}
              onClose={close}
              onRemove={(row) => void write(() => remove(row.id))}
              onRetry={
                lastWrite === null ? undefined : () => void write(lastWrite)
              }
              onSaved={saved}
              onSetDefault={(row) =>
                void write(() => setDefault(row.externalId))
              }
              onView={setDialog}
            />
          )}
        </>
      )}
    </StatusFrame>
  );
}

function PaymentMethodsDialog({
  choosing,
  derived,
  isMutating,
  locale,
  mutationError,
  onChoose,
  onClose,
  onRemove,
  onRetry,
  onSaved,
  onSetDefault,
  onView,
  t,
  view,
}: {
  choosing: boolean;
  derived: DerivedPaymentMethods;
  isMutating: boolean;
  locale: string;
  mutationError: Error | undefined;
  onChoose: () => void;
  onClose: () => void;
  onRemove: (row: PaymentMethodRow) => void;
  onRetry?: () => void;
  onSaved: (paymentMethodId: string) => Promise<void>;
  onSetDefault: (row: PaymentMethodRow) => void;
  onView: (view: DialogView) => void;
  t: Translator;
  view: DialogView;
}) {
  const { current, others, rows } = derived;
  // With nothing on file there is nothing to show but the form, as the
  // embed does; Cancel then closes the dialog, since there is nowhere else
  // to go.
  const hasMethods = rows.length > 0;
  const showForm = view === "add" || !hasMethods;

  return (
    <Dialog
      className="schematic-payment-methods__dialog"
      closeLabel={t("paymentMethodsClose")}
      open
      title={t("paymentMethodsDialogTitle")}
      onClose={onClose}
    >
      {showForm ? (
        <Suspense
          fallback={<FormSkeleton label={t("paymentMethodsFormLoading")} />}
        >
          <PaymentMethodForm
            locale={locale}
            t={t}
            onClose={hasMethods ? () => onView("current") : onClose}
            onSaved={onSaved}
            onSelectExisting={hasMethods ? () => onView("current") : undefined}
          />
        </Suspense>
      ) : (
        <>
          <MethodPill row={current} t={t} />
          <button
            aria-expanded={choosing}
            className="schematic-link-button schematic-payment-methods__choose"
            type="button"
            onClick={onChoose}
          >
            {t("paymentMethodsChooseDifferent")}
            <i
              aria-hidden="true"
              className={cx(
                "schematic-icon",
                choosing
                  ? "schematic-icon--chevron-up"
                  : "schematic-icon--chevron-down",
                "schematic-payment-methods__chevron",
              )}
            />
          </button>
          {choosing && (
            <>
              {others.length > 0 && (
                <ul
                  aria-label={t("paymentMethodsChooseDifferent")}
                  className="schematic-payment-methods__list"
                >
                  {others.map((row) => (
                    <li
                      className="schematic-payment-methods__row"
                      data-brand={row.brand}
                      data-kind={row.kind}
                      data-testid="schematic-payment-method"
                      key={row.id}
                    >
                      <Method row={row} t={t} />
                      {row.expiresShort !== null && (
                        <span className="schematic-muted schematic-small schematic-payment-methods__expires">
                          {t("paymentMethodsExpires", {
                            date: row.expiresShort,
                          })}
                        </span>
                      )}
                      <button
                        className="schematic-link-button schematic-payment-methods__set-default"
                        disabled={isMutating}
                        type="button"
                        onClick={() => onSetDefault(row)}
                      >
                        {t("paymentMethodsSetDefault")}
                      </button>
                      {row.canRemove && (
                        <button
                          aria-label={t("paymentMethodsRemove")}
                          className="schematic-payment-methods__remove"
                          disabled={isMutating}
                          type="button"
                          onClick={() => onRemove(row)}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="schematic-cta schematic-payment-methods__add-new"
                disabled={isMutating}
                type="button"
                onClick={() => onView("add")}
              >
                {t("paymentMethodsAddNew")}
              </button>
            </>
          )}
        </>
      )}
      {mutationError !== undefined && (
        <p
          className="schematic-status-note schematic-error schematic-payment-methods__error"
          role="alert"
        >
          <span className="schematic-payment-methods__error-message">
            {mutationError.message}
          </span>
          {onRetry !== undefined && (
            <button
              className="schematic-link-button schematic-payment-methods__error-retry"
              disabled={isMutating}
              type="button"
              onClick={onRetry}
            >
              {t("retry")}
            </button>
          )}
        </p>
      )}
    </Dialog>
  );
}

/**
 * The pill: the method on file, or the empty copy, with whatever action the
 * caller puts beside it.
 */
function MethodPill({
  children,
  row,
  t,
}: {
  children?: React.ReactNode;
  row: PaymentMethodRow | null;
  t: Translator;
}) {
  return (
    <div
      className="schematic-payment-methods__current"
      data-testid="schematic-payment-method-current"
    >
      {row === null ? (
        <span className="schematic-payment-methods__empty">
          {t("paymentMethodsEmpty")}
        </span>
      ) : (
        <Method row={row} t={t} />
      )}
      {children}
    </div>
  );
}

/**
 * "Card ending in 4444": the brand's mark, the label, and the digits that
 * follow it. The mark is decorative — the label already names the method —
 * so a host that blocks the font loses nothing but the glyph.
 */
function Method({ row, t }: { row: PaymentMethodRow; t: Translator }) {
  return (
    <span
      className="schematic-payment-methods__method"
      data-brand={row.brand}
      data-kind={row.kind}
    >
      <i
        aria-hidden="true"
        className={`schematic-icon schematic-icon--${row.icon} schematic-payment-methods__icon`}
      />
      <span className="schematic-payment-methods__label">
        {labelText(row.label, t)}
      </span>
      {row.last4 !== null && (
        <>
          {" "}
          <span className="schematic-payment-methods__last4">{row.last4}</span>
        </>
      )}
    </span>
  );
}

function labelText(label: PaymentMethodLabel, t: Translator): string {
  return label.key === undefined ? label.text : t(label.key);
}

/** "Expires in 2 months", or "Expired". */
function expiryWarningText(
  derived: DerivedPaymentMethods,
  t: Translator,
): string {
  const months = derived.monthsToExpiration ?? 0;
  return derived.expiryWarning === "expired"
    ? t("paymentMethodsExpired")
    : t("paymentMethodsExpiresInMonths", { count: months, months });
}

/**
 * Mirrors the loaded card's shape — a heading bar and the pill, with its
 * name on the left and its action on the right — so the page does not
 * reflow when the method arrives. The surrounding frame carries the loading
 * label.
 */
function PaymentMethodsSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="method" />
        <div className="schematic-skeleton__cell" data-column="action" />
      </div>
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
