import {
  usePaymentMethods,
  useTaxIds,
  type CheckoutProblem,
} from "@schematichq/schematic-react";
import { Suspense, lazy, useEffect, useId, useState } from "react";

import {
  findTaxIdJurisdiction,
  taxIdCountryOptions,
  taxIdJurisdictionsForCountry,
  toTaxIdInput,
  toTaxIdValues,
  type TaxIdValues,
} from "../../utils/taxIds";
import {
  Method,
  type PaymentMethodsCheckoutPrefill,
  type PaymentMethodsCheckoutSettings,
} from "../PaymentMethods";
import type { CartAction, CheckoutCart, CheckoutModel } from "../model";
import { derivePaymentMethods } from "../model";
import type { Translator } from "../strings";

import { ProblemList, type ProblemFormatter } from "./parts";

const PaymentMethodForm = lazy(() => import("../PaymentMethodForm"));

type Dispatch = (action: CartAction) => void;

export function PaymentStep({
  cart,
  checkoutPrefill,
  dispatch,
  flushTaxIdRef,
  format,
  locale,
  model,
  onAddingMethod,
  problems,
  t,
}: {
  cart: CheckoutCart;
  checkoutPrefill?: PaymentMethodsCheckoutPrefill;
  dispatch: Dispatch;
  flushTaxIdRef: { current: (() => Promise<void>) | null };
  format?: ProblemFormatter;
  locale: string;
  model: CheckoutModel;
  /** Whether the card form is open: the cart still pays with the old method until it saves. */
  onAddingMethod: (adding: boolean) => void;
  problems: readonly CheckoutProblem[] | undefined;
  t: Translator;
}) {
  const { requirements } = model;
  const settings: PaymentMethodsCheckoutSettings = {
    collectAddress: model.collect.address,
    collectEmail: model.collect.email,
    collectPhone: model.collect.phone,
  };
  const needsPayment =
    requirements.paymentMethodRequired || cart.paymentMethodId !== undefined;

  return (
    <section className="schematic-checkout__section" data-step="payment">
      {needsPayment ? (
        <PaymentMethodSection
          cart={cart}
          checkoutPrefill={checkoutPrefill}
          dispatch={dispatch}
          locale={locale}
          settings={settings}
          t={t}
          onAddingMethod={onAddingMethod}
        />
      ) : (
        <p className="schematic-muted">{t("checkoutPaymentNotRequired")}</p>
      )}
      <PromoCode cart={cart} dispatch={dispatch} model={model} t={t} />
      {requirements.collectTaxId && (
        <TaxIdField flushTaxIdRef={flushTaxIdRef} locale={locale} t={t} />
      )}
      {requirements.customFields.length > 0 && (
        <CustomFields dispatch={dispatch} model={model} t={t} />
      )}
      {requirements.optIn.required && (
        <OptIn cart={cart} dispatch={dispatch} model={model} t={t} />
      )}
      <ProblemList format={format} problems={problems} />
    </section>
  );
}

/**
 * The method the checkout pays with: the one on file, or the card form. A
 * card saved through the form is the one this checkout pays with; it also
 * joins the company's methods on file.
 */
function PaymentMethodSection({
  cart,
  checkoutPrefill,
  dispatch,
  locale,
  onAddingMethod,
  settings,
  t,
}: {
  cart: CheckoutCart;
  checkoutPrefill?: PaymentMethodsCheckoutPrefill;
  dispatch: Dispatch;
  locale: string;
  onAddingMethod: (adding: boolean) => void;
  settings: PaymentMethodsCheckoutSettings;
  t: Translator;
}) {
  const { data: methods = [], setDefault } = usePaymentMethods();
  const derived = derivePaymentMethods(methods, { locale });
  const chosen =
    derived.rows.find((row) => row.externalId === cart.paymentMethodId) ?? null;
  const [adding, setAddingState] = useState(chosen === null);
  const setAdding = (next: boolean) => {
    setAddingState(next);
    onAddingMethod(next);
  };
  // Leaving the step closes the form, and the checkout's hold on the charge
  // with it.
  useEffect(() => () => onAddingMethod(false), [onAddingMethod]);

  return (
    <div className="schematic-checkout__section">
      <h3 className="schematic-checkout__section-title">
        {t("checkoutPaymentMethod")}
      </h3>
      {!adding && chosen !== null ? (
        <div className="schematic-payment-methods__current">
          <Method row={chosen} t={t} />
          <button
            className="schematic-link-button"
            type="button"
            onClick={() => setAdding(true)}
          >
            {t("checkoutUseDifferentMethod")}
          </button>
        </div>
      ) : (
        <Suspense
          fallback={
            <div aria-busy="true" className="schematic-skeleton">
              <span className="schematic-hidden">
                {t("paymentMethodsFormLoading")}
              </span>
            </div>
          }
        >
          <PaymentMethodForm
            checkoutPrefill={checkoutPrefill}
            checkoutSettings={settings}
            locale={locale}
            t={t}
            onSaved={async (paymentMethodId) => {
              // Stripe holds the new card, but the company's list learns of
              // it only from this write; without it the card is not on file
              // to show as the one this checkout pays with.
              await setDefault(paymentMethodId);
              dispatch({ type: "paymentMethod", paymentMethodId });
              setAdding(false);
            }}
            onSelectExisting={
              derived.rows.length > 0 ? () => setAdding(false) : undefined
            }
          />
        </Suspense>
      )}
    </div>
  );
}

function PromoCode({
  cart,
  dispatch,
  model,
  t,
}: {
  cart: CheckoutCart;
  dispatch: Dispatch;
  model: CheckoutModel;
  t: Translator;
}) {
  const id = useId();
  const [typed, setTyped] = useState("");
  if (cart.promoCode !== undefined) {
    return (
      <div
        className="schematic-checkout__inline"
        data-testid="schematic-checkout-promo"
      >
        <span className="schematic-chip">
          {model.totals?.promoCodeApplied === true
            ? t("checkoutPromoApplied", { code: cart.promoCode })
            : cart.promoCode}
        </span>
        <button
          className="schematic-link-button"
          type="button"
          onClick={() => dispatch({ type: "promoCode", promoCode: undefined })}
        >
          {t("checkoutPromoRemove")}
        </button>
      </div>
    );
  }
  return (
    <form
      className="schematic-checkout__inline"
      data-testid="schematic-checkout-promo"
      onSubmit={(event) => {
        event.preventDefault();
        if (typed.trim() !== "") {
          dispatch({ type: "promoCode", promoCode: typed.trim() });
          setTyped("");
        }
      }}
    >
      <span className="schematic-checkout__field">
        <label className="schematic-checkout__field-label" htmlFor={id}>
          {t("checkoutPromoCode")}
        </label>
        <input
          autoComplete="off"
          className="schematic-checkout__input"
          id={id}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
      </span>
      <button
        className="schematic-cta schematic-cta--small schematic-cta--outline"
        disabled={typed.trim() === ""}
        type="submit"
      >
        {t("checkoutPromoApply")}
      </button>
    </form>
  );
}

/**
 * The tax ID on the company's billing customer. It is not part of the cart:
 * it saves on its own, when the field is left and again before a finalize,
 * so the invoice the checkout raises carries it.
 */
function TaxIdField({
  flushTaxIdRef,
  locale,
  t,
}: {
  flushTaxIdRef: { current: (() => Promise<void>) | null };
  locale: string;
  t: Translator;
}) {
  const { data: taxIds, isMutating, mutationError, update } = useTaxIds();
  const countryId = useId();
  const typeId = useId();
  const valueId = useId();
  const [values, setValues] = useState<TaxIdValues | null>(null);
  const [saved, setSaved] = useState(false);
  const shown = values ?? toTaxIdValues(taxIds?.[0]);
  const jurisdictions = taxIdJurisdictionsForCountry(shown.country);
  const jurisdiction = findTaxIdJurisdiction(shown.country, shown.type);
  const mismatch =
    jurisdiction !== undefined &&
    shown.value.trim() !== "" &&
    !jurisdiction.pattern.test(shown.value.trim());

  const save = async () => {
    if (values === null) {
      return;
    }
    const input = toTaxIdInput(values);
    if (input === undefined) {
      return;
    }
    await update(input);
    setValues(null);
    setSaved(true);
  };

  useEffect(() => {
    flushTaxIdRef.current = save;
    return () => {
      flushTaxIdRef.current = null;
    };
  });

  const change = (next: Partial<TaxIdValues>) => {
    setSaved(false);
    setValues({ ...shown, ...next });
  };

  return (
    <fieldset
      className="schematic-checkout__section"
      data-testid="schematic-checkout-tax-id"
    >
      <legend className="schematic-checkout__section-title">
        {t("checkoutTaxId")}
      </legend>
      <div className="schematic-checkout__inline">
        <span className="schematic-checkout__field">
          <label
            className="schematic-checkout__field-label"
            htmlFor={countryId}
          >
            {t("checkoutTaxIdCountry")}
          </label>
          <select
            className="schematic-select"
            id={countryId}
            value={shown.country}
            onChange={(event) => {
              const options = taxIdJurisdictionsForCountry(event.target.value);
              change({
                country: event.target.value,
                type: options.length === 1 ? options[0].stripeType : "",
              });
            }}
          >
            <option value="" />
            {taxIdCountryOptions(locale).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
        {jurisdictions.length > 1 && (
          <span className="schematic-checkout__field">
            <label className="schematic-checkout__field-label" htmlFor={typeId}>
              {t("checkoutTaxIdType")}
            </label>
            <select
              className="schematic-select"
              id={typeId}
              value={shown.type}
              onChange={(event) => change({ type: event.target.value })}
            >
              <option value="" />
              {jurisdictions.map((j) => (
                <option key={j.stripeType} value={j.stripeType}>
                  {j.label}
                </option>
              ))}
            </select>
          </span>
        )}
        <span className="schematic-checkout__field">
          <label className="schematic-checkout__field-label" htmlFor={valueId}>
            {t("checkoutTaxIdValue")}
          </label>
          <input
            className="schematic-checkout__input"
            id={valueId}
            placeholder={jurisdiction?.example}
            value={shown.value}
            onBlur={() => void save().catch(() => undefined)}
            onChange={(event) => change({ value: event.target.value })}
          />
        </span>
      </div>
      {mismatch && (
        <p className="schematic-checkout__field-helper">
          {t("checkoutTaxIdFormat", { example: jurisdiction.example })}
        </p>
      )}
      {mutationError !== undefined && !isMutating && (
        <p className="schematic-error schematic-small" role="alert">
          {t("checkoutTaxIdError")}
        </p>
      )}
      {saved && mutationError === undefined && (
        <p className="schematic-muted schematic-small">
          {t("checkoutTaxIdSaved")}
        </p>
      )}
    </fieldset>
  );
}

function CustomFields({
  dispatch,
  model,
  t,
}: {
  dispatch: Dispatch;
  model: CheckoutModel;
  t: Translator;
}) {
  return (
    <fieldset className="schematic-checkout__section">
      <legend className="schematic-checkout__section-title">
        {t("checkoutCustomFields")}
      </legend>
      {model.requirements.customFields.map((field) => (
        <CustomField dispatch={dispatch} field={field} key={field.id} t={t} />
      ))}
    </fieldset>
  );
}

function CustomField({
  dispatch,
  field,
  t,
}: {
  dispatch: Dispatch;
  field: CheckoutModel["requirements"]["customFields"][number];
  t: Translator;
}) {
  const id = useId();
  const helperId = useId();
  return (
    <span className="schematic-checkout__field">
      <label className="schematic-checkout__field-label" htmlFor={id}>
        {field.name}
        {field.required && (
          <span className="schematic-muted"> ({t("checkoutRequired")})</span>
        )}
      </label>
      <input
        aria-describedby={field.helperText === null ? undefined : helperId}
        className="schematic-checkout__input"
        id={id}
        required={field.required}
        value={field.value}
        onChange={(event) =>
          dispatch({
            type: "customField",
            fieldId: field.id,
            value: event.target.value,
          })
        }
      />
      {field.helperText !== null && (
        <span className="schematic-checkout__field-helper" id={helperId}>
          {field.helperText}
        </span>
      )}
    </span>
  );
}

/**
 * The agreement the checkout asks the customer to accept. Accepting one
 * wording is not accepting another, so new copy clears the box.
 */
function OptIn({
  cart,
  dispatch,
  model,
  t,
}: {
  cart: CheckoutCart;
  dispatch: Dispatch;
  model: CheckoutModel;
  t: Translator;
}) {
  const { text, title } = model.requirements.optIn;
  const wording = `${title ?? ""}\u0000${text ?? ""}`;
  // Seeded from the cart, so coming back to the step keeps a box already
  // ticked on this wording.
  const [acceptedWording, setAcceptedWording] = useState<string | null>(() =>
    cart.optInAccepted ? wording : null,
  );
  useEffect(() => {
    if (cart.optInAccepted && acceptedWording !== wording) {
      dispatch({ type: "optIn", accepted: false });
    }
  }, [acceptedWording, cart.optInAccepted, dispatch, wording]);

  return (
    <div
      className="schematic-checkout__section"
      data-testid="schematic-checkout-opt-in"
    >
      {title !== null && (
        <h3 className="schematic-checkout__section-title">{title}</h3>
      )}
      {text !== null && (
        <p className="schematic-checkout__opt-in-text">{text}</p>
      )}
      <label className="schematic-checkout__check">
        <input
          checked={cart.optInAccepted}
          type="checkbox"
          onChange={(event) => {
            setAcceptedWording(event.target.checked ? wording : null);
            dispatch({ type: "optIn", accepted: event.target.checked });
          }}
        />
        <span>{t("checkoutOptInAccept")}</span>
      </label>
    </div>
  );
}
