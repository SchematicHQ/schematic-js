import {
  checkoutProblemsOf,
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
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

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
import { confirmPayment, loadStripeForIntent } from "./stripe";

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
  locale: localeProp,
  onOpenChange,
  open,
  strings,
  ...rest
}: CheckoutProps) {
  const t = useTranslator(strings, localeProp);
  return (
    <Dialog
      className={cx("schematic-checkout", className)}
      closeLabel={t("checkoutClose")}
      open={open}
      title={t("checkoutTitle")}
      onClose={() => onOpenChange(false)}
    >
      <CheckoutBody
        {...rest}
        locale={localeProp}
        strings={strings}
        t={t}
        onOpenChange={onOpenChange}
      />
    </Dialog>
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
  const catalogData = catalog.data;
  const ready =
    catalogData !== undefined &&
    settled(company) &&
    settled(methods) &&
    settled(usage);

  const errorMessage =
    catalog.error === undefined
      ? undefined
      : httpStatus(catalog.error) === 404
        ? t("checkoutUnavailable")
        : t("checkoutError");

  return (
    <StatusFrame
      className="schematic-checkout__frame"
      error={catalog.error}
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
    if (next === null) {
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
  }, [selectionsKey, setSelections]);

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

  const [finalizing, setFinalizing] = useState(false);
  const [addingMethod, setAddingMethod] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const finalize = async () => {
    setFinalizing(true);
    setFinalizeError(null);
    let charged: CheckoutResult | undefined;
    try {
      await flushTaxIdRef.current?.();
      charged = await checkout.finalize();
      const secret = charged.confirmPaymentIntentClientSecret;
      if (secret != null && secret !== "") {
        const stripe = await loadStripeForIntent(
          await createSetupIntent(),
          locale,
        );
        await confirmPayment(stripe, secret);
      }
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
  const dueNow = checkout.snapshot?.dueNow ?? 0;

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
          disabled={!model.canFinalize || finalizing || addingMethod}
          type="button"
          onClick={() => void finalize()}
        >
          {finalizing
            ? t("checkoutFinalizing")
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

  return (
    <div className="schematic-checkout__layout" data-step={step}>
      <div className="schematic-checkout__main">
        <Stepper current={step} plan={stepPlan} t={t} onSelect={goTo} />
        <h3 className="schematic-checkout__heading">{stepLabel(step, t)}</h3>
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
        {back !== undefined && (
          <div className="schematic-checkout__nav">
            <button
              className="schematic-link-button"
              type="button"
              onClick={() => goTo(back)}
            >
              {t("checkoutBack")}
            </button>
          </div>
        )}
      </div>
      <Summary
        action={action}
        isPricing={isPricing}
        model={model}
        pricingError={pricingError}
        showDisclaimer={display?.showBillingDisclaimer !== false}
        t={t}
      />
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
