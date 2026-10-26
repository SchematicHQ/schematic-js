import {
  checkoutProblemsOf,
  useBillingDataSource,
  useCatalog,
  useCheckout,
  useCompany,
  useFeatureUsage,
  usePaymentMethods,
  useSetupIntent,
  type Catalog,
  type CheckoutProblem,
  type CheckoutResult,
  type CheckoutSelections,
  type Company,
  type FeatureUsage,
  type PaymentMethod,
} from "@schematichq/schematic-react";
import React, {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import type { PaymentMethodsCheckoutPrefill } from "./PaymentMethods";
import { PaymentStep } from "./checkout/PaymentStep";
import { Summary } from "./checkout/Summary";
import {
  ProblemList,
  stepLabel,
  type ProblemFormatter,
} from "./checkout/parts";
import {
  AddOnsStep,
  AutoTopupStep,
  CreditsStep,
  CurrencySelect,
  PlanStep,
  QuantityStep,
  Stepper,
} from "./checkout/steps";
import {
  Dialog,
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
} from "./common";
import {
  cartPlan,
  cartReducer,
  checkoutSelections,
  deriveCheckout,
  httpStatus,
  initialCart,
  landOn,
  normalizePeriod,
  openingStep,
  planSteps,
  stepAfter,
  stepBefore,
  stepOfProblem,
  type CheckoutConfig,
  type CheckoutStep,
} from "./model";
import type { Translator } from "./strings";
import {
  PaymentNotConfirmedError,
  confirmPayment,
  loadStripeForIntent,
} from "./stripe";

/** How long the cart rests before it is priced, so typing a quantity prices once. */
export const CHECKOUT_PRICE_DELAY_MS = 250;

export interface CheckoutProps extends ElementProps, CheckoutConfig {
  open: boolean;
  /** Called with `false` when the customer closes the dialog or the purchase completes. */
  onOpenChange: (open: boolean) => void;
  /**
   * After the purchase is charged, and confirmed with the customer where the
   * payment needed it. The billing data it changed is already reloading.
   */
  onComplete?: (result: CheckoutResult) => void;
  /** Each time the server's list of what is wrong with the cart changes. */
  onProblems?: (problems: readonly CheckoutProblem[]) => void;
  onStepChange?: (step: CheckoutStep) => void;
  /**
   * The words a problem is shown in; `undefined` shows the server's message.
   * `problem.code` says which problem it is.
   */
  formatProblem?: ProblemFormatter;
  /** Values the card form starts with. */
  checkoutPrefill?: PaymentMethodsCheckoutPrefill;
}

/**
 * A purchase in a dialog: the plan and its period, add-ons, pay-in-advance
 * quantities, credit bundles and automatic top-ups, then payment. Each change
 * is priced on the server, which decides what it costs and what is wrong with
 * it; the dialog decides only the order the choices are asked in.
 *
 * Nothing loads while it is closed, and every opening starts a new cart from
 * `selection` and what the company has now.
 */
export function Checkout({
  className,
  display,
  locale: localeProp,
  onOpenChange,
  open,
  strings,
  ...rest
}: CheckoutProps) {
  const t = useTranslator(strings, localeProp);
  const stacked =
    display?.layout === "stacked" && "schematic-checkout--stacked";
  const body = (
    <CheckoutBody
      {...rest}
      display={display}
      locale={localeProp}
      strings={strings}
      t={t}
      onOpenChange={onOpenChange}
    />
  );
  if (display?.container === "inline") {
    return (
      <InlineFrame
        className={cx(
          "schematic-checkout",
          "schematic-checkout--inline",
          stacked,
          className,
        )}
        open={open}
        title={t("checkoutTitle")}
      >
        {body}
      </InlineFrame>
    );
  }
  return (
    <Dialog
      className={cx("schematic-checkout", stacked, className)}
      closeLabel={t("checkoutClose")}
      open={open}
      title={t("checkoutTitle")}
      onClose={() => onOpenChange(false)}
    >
      {body}
    </Dialog>
  );
}

/**
 * The checkout in the page rather than over it: the dialog's header and
 * body without the dialog, so the same stylesheet applies. Nothing renders
 * while closed, as in the dialog; the host's page owns any way out.
 */
function InlineFrame({
  children,
  className,
  open,
  title,
}: {
  children: React.ReactNode;
  className: string;
  open: boolean;
  title: string;
}) {
  const headingId = useId();
  if (!open) {
    return null;
  }
  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="schematic-dialog__header">
        <h2 className="schematic-dialog__title" id={headingId}>
          {title}
        </h2>
      </div>
      <div className="schematic-dialog__body">{children}</div>
    </section>
  );
}

type BodyProps = Omit<CheckoutProps, "open" | "className"> & { t: Translator };

/** Loaded, or failed: a read that is not needed to buy may fail and be done with. */
const settled = (handle: { data: unknown; error: Error | undefined }) =>
  handle.data !== undefined || handle.error !== undefined;

function CheckoutBody(props: BodyProps) {
  const { catalogId, t } = props;
  const catalog = useCatalog(
    catalogId === undefined ? undefined : { catalogId },
  );
  const company = useCompany();
  const methods = usePaymentMethods();
  const usage = useFeatureUsage();
  // Buying needs the company's catalog; the public one waits for a session,
  // and so does its error, which says nothing about this company.
  const readingPublic = useBillingDataSource().catalogSource?.() === "public";
  const catalogData =
    catalog.data?.source === "company" ? catalog.data.catalog : undefined;
  const catalogError = readingPublic ? undefined : catalog.error;
  const ready =
    catalogData !== undefined &&
    settled(company) &&
    settled(methods) &&
    settled(usage);

  const errorMessage =
    catalogError === undefined
      ? undefined
      : httpStatus(catalogError) === 404
        ? t("checkoutUnavailable")
        : t("checkoutError");

  return (
    <StatusFrame
      className="schematic-checkout__frame"
      error={catalogError}
      errorMessage={errorMessage}
      hasData={ready}
      isPending={!ready}
      loadingLabel={t("checkoutLoading")}
      onRetry={catalog.refetch}
      retryText={t("retry")}
    >
      {ready &&
        catalogData !== undefined &&
        (catalogData.capabilities.checkout ? (
          <CheckoutFlow
            {...props}
            catalog={catalogData}
            company={company.data}
            featureUsage={usage.data ?? []}
            paymentMethods={methods.data ?? []}
            t={t}
          />
        ) : (
          <p className="schematic-notice schematic-checkout__unavailable">
            {t("checkoutUnavailable")}
          </p>
        ))}
    </StatusFrame>
  );
}

interface FlowProps extends BodyProps {
  catalog: Catalog;
  company: Company | undefined;
  featureUsage: FeatureUsage[];
  paymentMethods: PaymentMethod[];
  t: Translator;
}

function CheckoutFlow({
  catalog,
  checkoutPrefill,
  company,
  display,
  featureUsage,
  formatProblem,
  locale: localeProp,
  onComplete,
  onOpenChange,
  onProblems,
  onStepChange,
  paymentMethods,
  selection,
  steps,
  t,
}: FlowProps) {
  const locale = useResolvedLocale(localeProp);
  const [cart, dispatch] = useReducer(cartReducer, undefined, () =>
    initialCart({
      catalog,
      company,
      config: { display, selection, steps },
      featureUsage,
      paymentMethods,
    }),
  );
  const checkout = useCheckout();
  const { create: createSetupIntent } = useSetupIntent();
  const flushTaxIdRef = useRef<(() => Promise<void>) | null>(null);
  // A charge the customer has not confirmed: the checkout is completed on
  // the server, so a retry confirms again rather than finalizing again, which
  // would only be refused. Stripe takes the card off a failed intent, so the
  // retry names it: the one Stripe reported, else the one the cart paid with.
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    charged: CheckoutResult;
    secret: string;
    paymentMethodId: string | undefined;
  } | null>(null);
  const confirming = pendingConfirmation !== null;

  // A plan chosen after the period may not be sold on it.
  useEffect(() => {
    const period = normalizePeriod(cart, catalog);
    if (period !== cart.period) {
      dispatch({ type: "period", period });
    }
  }, [cart, catalog]);

  const selections = useMemo(
    () => checkoutSelections(cart, catalog, company),
    [cart, catalog, company],
  );
  const selectionsKey = JSON.stringify(selections ?? null);
  const [pricedKey, setPricedKey] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState(false);
  const { setSelections } = checkout;
  // Keyed by the cart as data, not its identity, so a dispatch that changes
  // nothing does not price again; the selections are plain data and survive
  // the round trip.
  useEffect(() => {
    const next = JSON.parse(selectionsKey) as CheckoutSelections | null;
    // Not while a charge waits on its confirmation: the checkout is closed,
    // and a write would open another beside it.
    if (next === null || confirming) {
      return;
    }
    const timer = setTimeout(() => {
      setPricedKey(selectionsKey);
      setSelections(next).then(
        () => setPricingError(false),
        () => setPricingError(true),
      );
    }, CHECKOUT_PRICE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [confirming, selectionsKey, setSelections]);

  const isPricing =
    checkout.isPricing ||
    (selections !== undefined && selectionsKey !== pricedKey);

  // The problems are the draft's, not the checkout row's: a refused finalize
  // answers with its list, and the row read back after it may not carry it.
  const priced =
    checkout.checkout === undefined
      ? undefined
      : { ...checkout.checkout, problems: checkout.problems };

  const model = deriveCheckout({
    catalog,
    cart,
    checkout: priced,
    company,
    display,
    featureUsage,
    isPricing,
    locale,
  });

  const [revisited, setRevisited] = useState<ReadonlySet<CheckoutStep>>(
    () => new Set(),
  );
  const stepPlan = planSteps(
    { catalog, cart, checkout: priced, company, config: steps },
    revisited,
  );
  const [chosenStep, setChosenStep] = useState<CheckoutStep>(() =>
    openingStep(stepPlan, steps?.initial),
  );
  // A step the cart no longer has — the add-on whose quantity it was, gone —
  // hands over to the next one it does.
  const step = stepPlan.available.includes(chosenStep)
    ? chosenStep
    : landOn(stepPlan, chosenStep);

  // Both reported per change, not per render of a host that passes a new
  // callback each time.
  const onStepChangeRef = useRef(onStepChange);
  const onProblemsRef = useRef(onProblems);
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
    onProblemsRef.current = onProblems;
  });
  useEffect(() => {
    onStepChangeRef.current?.(step);
  }, [step]);
  const problems = checkout.problems;
  useEffect(() => {
    onProblemsRef.current?.(problems);
  }, [problems]);

  const goTo = (next: CheckoutStep) => {
    if (stepPlan.skipped.has(next)) {
      setRevisited((was) => new Set([...was, next]));
    }
    setChosenStep(next);
  };

  // A new step starts at its top: the column that scrolls side by side, and
  // the dialog that scrolls as a whole when stacked.
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const main = mainRef.current;
    if (main === null) {
      return;
    }
    for (const node of [main, main.closest("dialog")]) {
      if (node !== null && typeof node.scrollTo === "function") {
        node.scrollTo({ top: 0 });
      }
    }
  }, [step]);

  const [finalizing, setFinalizing] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const finalize = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    let charged: CheckoutResult | undefined;
    let secret: string | undefined;
    let paymentMethodId: string | undefined;
    try {
      if (pendingConfirmation !== null) {
        ({ charged, secret, paymentMethodId } = pendingConfirmation);
      } else {
        await flushTaxIdRef.current?.();
        charged = await checkout.finalize();
        secret = charged.confirmPaymentIntentClientSecret ?? undefined;
      }
      if (secret !== undefined && secret !== "") {
        const stripe = await loadStripeForIntent(
          await createSetupIntent(),
          locale,
        );
        await confirmPayment(stripe, secret, paymentMethodId);
      }
      setPendingConfirmation(null);
      onComplete?.(charged);
      onOpenChange(false);
    } catch (error) {
      const refused = checkoutProblemsOf(error);
      if (refused !== undefined) {
        // The refusal's problems are on the checkout now; take the customer
        // to the first step that can fix one.
        const fixable = refused
          .filter((p) => p.blocking)
          .map((p) => stepOfProblem(p, { cart, catalog }))
          .find((s): s is CheckoutStep => s !== undefined);
        if (fixable !== undefined) {
          goTo(fixable);
        }
      } else if (charged !== undefined) {
        if (secret !== undefined && secret !== "") {
          const failed =
            error instanceof PaymentNotConfirmedError
              ? error.paymentMethodId
              : undefined;
          setPendingConfirmation({
            charged,
            secret,
            paymentMethodId: failed ?? paymentMethodId ?? cart.paymentMethodId,
          });
        }
        const message = error instanceof Error ? error.message : String(error);
        setFinalizeError(t("checkoutPaymentFailed", { message }));
      } else {
        setFinalizeError(t("checkoutFinalizeError"));
      }
    } finally {
      setFinalizing(false);
    }
  };

  const next = stepAfter(stepPlan, step);
  const back = stepBefore(stepPlan, step);
  const plan = cartPlan(cart, catalog);
  const canLeavePlan =
    (plan !== undefined &&
      model.plans.some((row) => row.selected && row.priceText !== null)) ||
    (plan === undefined && stepPlan.available.includes("credits"));
  const trialStarting = model.trial;
  // A refused re-price answers with no snapshot; the action keeps saying
  // what the last price said rather than flipping to Confirm while disabled.
  const snapshotDueNow = checkout.snapshot?.dueNow;
  const [lastDueNow, setLastDueNow] = useState<number | undefined>();
  if (snapshotDueNow !== undefined && snapshotDueNow !== lastDueNow) {
    setLastDueNow(snapshotDueNow);
  }
  const dueNow = snapshotDueNow ?? lastDueNow ?? 0;

  const action =
    next === undefined ? (
      <>
        {finalizeError !== null && (
          <p className="schematic-error schematic-small" role="alert">
            {finalizeError}
          </p>
        )}
        <button
          className="schematic-cta"
          data-testid="schematic-checkout-finalize"
          disabled={
            (pendingConfirmation === null && !model.canFinalize) ||
            finalizing ||
            addingMethod
          }
          type="button"
          onClick={() => void finalize()}
        >
          {finalizing
            ? t("checkoutFinalizing")
            : pendingConfirmation !== null
              ? t("checkoutConfirmPayment")
              : trialStarting
                ? t("checkoutStartTrial")
                : dueNow > 0
                  ? t("checkoutPay")
                  : t("checkoutConfirm")}
        </button>
      </>
    ) : (
      <button
        className="schematic-cta"
        data-testid="schematic-checkout-next"
        disabled={step === "plan" && !canLeavePlan}
        type="button"
        onClick={() => goTo(next)}
      >
        {t("checkoutNext", { step: stepLabel(next, t) })}
      </button>
    );

  const stepProblems = model.problems.byStep[step];
  // Held for the payment step, the summary leaves its Next action with the
  // step's own navigation; payment is the last step, so the action there is
  // always Next.
  const summaryHeld = display?.summary === "payment";
  const summaryShown = !summaryHeld || step === "payment";

  return (
    <div
      className="schematic-checkout__layout"
      data-step={step}
      data-summary={summaryHeld ? "payment" : undefined}
    >
      <div className="schematic-checkout__main" ref={mainRef}>
        <Stepper current={step} plan={stepPlan} t={t} onSelect={goTo} />
        <h3 className="schematic-checkout__heading">{stepLabel(step, t)}</h3>
        {/* A plan step passed over takes its currency choice with it; a new
            customer still gets to pick, on the first step shown. */}
        {step !== "plan" &&
          stepPlan.skipped.has("plan") &&
          model.currency.selectable && (
            <div className="schematic-checkout__controls">
              <CurrencySelect dispatch={dispatch} model={model} t={t} />
            </div>
          )}
        {step === "plan" && (
          <PlanStep
            dispatch={dispatch}
            format={formatProblem}
            model={model}
            problems={stepProblems}
            t={t}
            trialChosen={cart.trial}
            trialOffered={
              plan !== undefined && plan.isTrialable && plan.companyCanTrial
            }
          />
        )}
        {step === "autoTopup" && (
          <AutoTopupStep dispatch={dispatch} rows={model.autoTopups} t={t} />
        )}
        {(step === "usage" || step === "addOnUsage") && (
          <QuantityStep
            dispatch={dispatch}
            format={formatProblem}
            problems={stepProblems}
            rows={step === "usage" ? model.usage : model.addOnUsage}
            step={step}
            t={t}
          />
        )}
        {step === "addOns" && (
          <AddOnsStep
            dispatch={dispatch}
            format={formatProblem}
            model={model}
            problems={stepProblems}
            t={t}
          />
        )}
        {step === "credits" && (
          <CreditsStep
            dispatch={dispatch}
            format={formatProblem}
            mode={model.bundleMode}
            problems={stepProblems}
            rows={model.bundles}
            t={t}
          />
        )}
        {step === "payment" && (
          <PaymentStep
            cart={cart}
            checkoutPrefill={checkoutPrefill}
            dispatch={dispatch}
            flushTaxIdRef={flushTaxIdRef}
            format={formatProblem}
            locale={locale}
            model={model}
            problems={[...(stepProblems ?? []), ...model.problems.global]}
            t={t}
            onAddingMethod={setAddingMethod}
          />
        )}
        {step !== "payment" && model.problems.global.length > 0 && (
          <ProblemList
            format={formatProblem}
            problems={model.problems.global}
          />
        )}
        {(back !== undefined || !summaryShown) && (
          <div className="schematic-checkout__nav">
            {back !== undefined && (
              <button
                className="schematic-link-button"
                type="button"
                onClick={() => goTo(back)}
              >
                {t("checkoutBack")}
              </button>
            )}
            {!summaryShown && action}
          </div>
        )}
      </div>
      {summaryShown && (
        <>
          <Summary
            isPricing={isPricing}
            model={model}
            pricingError={pricingError}
            showDisclaimer={display?.showBillingDisclaimer !== false}
            t={t}
          />
          {/* Under the summary, and kept in view on a narrow screen while
              the rest scrolls, so Next and Pay are never below the fold. */}
          <div className="schematic-checkout__action">{action}</div>
        </>
      )}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
Checkout.resources = [
  "catalog",
  "company",
  "paymentMethods",
  "featureUsage",
] as const;

export default Checkout;
