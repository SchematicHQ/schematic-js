import { useSetupIntent } from "@schematichq/schematic-react";
import type * as ReactStripe from "@stripe/react-stripe-js";
import type {
  Appearance,
  Stripe,
  StripeConstructorOptions,
  StripeElementLocale,
} from "@stripe/stripe-js";
import React, { useEffect, useRef, useState } from "react";

import type { Translator } from "./strings";
import { withTokenDefaults } from "./styles/tokens";

/**
 * The Add form: a Stripe PaymentElement over a setup intent the API mints
 * for the company. Loaded lazily by `PaymentMethods`, and the Stripe packages
 * are imported here at runtime, so a page that only lists methods never
 * downloads Stripe. Both packages are optional peers; a host without them
 * gets the load error rather than a crash.
 */

export interface PaymentMethodFormProps {
  locale: string;
  t: Translator;
  /** The saved method's provider id; resolves once the list has taken it. */
  onSaved: (paymentMethodId: string) => Promise<void>;
  /** The "Select existing payment method" link; omitted when there is none
   * to select. */
  onSelectExisting?: () => void;
}

type StripeUi = Pick<
  typeof ReactStripe,
  "Elements" | "PaymentElement" | "useElements" | "useStripe"
>;

type FormState =
  | { status: "loading" }
  /** Which step failed: minting the setup intent, or loading Stripe. */
  | {
      status: "failed";
      errorKey: "paymentMethodsSetupError" | "paymentMethodsFormError";
    }
  | {
      status: "ready";
      appearance: Appearance;
      clientSecret: string;
      stripe: Stripe;
      ui: StripeUi;
    };

const NO_CLIENT_SECRET = "The setup intent carries no client secret.";
const STRIPE_NOT_LOADED = "Stripe.js did not load.";

/**
 * The tokens Stripe's iframe is themed from, as the properties a probe
 * element resolves them through. Written with the same fallbacks as the
 * stylesheet, so a host that sets no token gets the element's own palette.
 */
const PROBE_CSS = withTokenDefaults(
  [
    "background-color: var(--schematic-background)",
    "border-color: var(--schematic-accent)",
    "border-radius: var(--schematic-radius)",
    "color: var(--schematic-text)",
    "font-family: var(--schematic-font-body)",
    "outline-color: var(--schematic-danger)",
    "position: absolute",
    "visibility: hidden",
  ].join("; "),
);

/** How long Stripe's fields get to come up before the form reports them
 * blocked, as the embed waits. */
const READY_TIMEOUT_MS = 10_000;

/** A computed value the browser resolved; jsdom hands back the `var()`. */
function resolved(value: string): boolean {
  return value !== "" && !value.includes("var(");
}

/**
 * Stripe's Elements render in an iframe, where the host's CSS variables do
 * not reach, so the tokens are resolved here — `light-dark()` included, as
 * the browser sees the host's `color-scheme` — and handed over as values.
 * A dark host gets a form it can read.
 */
export function resolveAppearance(host: Element): Appearance {
  const document = host.ownerDocument;
  const probe = document.createElement("span");
  probe.style.cssText = PROBE_CSS;
  host.appendChild(probe);
  const style = (document.defaultView ?? window).getComputedStyle(probe);
  const candidates: Record<string, string> = {
    borderRadius: style.borderTopLeftRadius,
    colorBackground: style.backgroundColor,
    colorDanger: style.outlineColor,
    colorPrimary: style.borderTopColor,
    colorText: style.color,
    fontFamily: style.fontFamily,
  };
  probe.remove();
  const variables: Record<string, string> = {};
  for (const [name, value] of Object.entries(candidates)) {
    if (resolved(value)) {
      variables[name] = value;
    }
  }
  return { theme: "stripe", variables };
}

export function PaymentMethodForm({
  locale,
  onSaved,
  onSelectExisting,
  t,
}: PaymentMethodFormProps) {
  const { create } = useSetupIntent();
  const [state, setState] = useState<FormState>({ status: "loading" });
  // Where the form will mount, so the appearance is read under the host's
  // own tokens rather than the page's.
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let setupFailed = false;
    Promise.all([
      create().catch((error: unknown) => {
        setupFailed = true;
        throw error;
      }),
      import("@stripe/stripe-js"),
      import("@stripe/react-stripe-js"),
    ])
      .then(async ([intent, stripeJs, ui]) => {
        const clientSecret = intent.setupIntentClientSecret ?? null;
        if (clientSecret === null || clientSecret === "") {
          throw new Error(NO_CLIENT_SECRET);
        }
        // A connected account is charged through Schematic's own key with
        // the account named; a direct account uses its own key.
        let publishableKey =
          intent.publishableKey ?? intent.schematicPublishableKey;
        const options: StripeConstructorOptions = {
          locale: locale as StripeElementLocale,
        };
        if (intent.accountId !== undefined && intent.accountId !== null) {
          publishableKey = intent.schematicPublishableKey;
          options.stripeAccount = intent.accountId;
        }
        const stripe = await stripeJs.loadStripe(publishableKey, options);
        if (stripe === null) {
          throw new Error(STRIPE_NOT_LOADED);
        }
        if (!cancelled) {
          const appearance = resolveAppearance(
            hostRef.current ?? document.body,
          );
          setState({ status: "ready", appearance, clientSecret, stripe, ui });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "failed",
            errorKey: setupFailed
              ? "paymentMethodsSetupError"
              : "paymentMethodsFormError",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // `create` is memoized by the hook; a new locale is a new Stripe load.
  }, [create, locale]);

  if (state.status === "loading") {
    return (
      <div
        aria-busy="true"
        className="schematic-payment-methods__form"
        data-state="pending"
        ref={hostRef}
      >
        <span className="schematic-hidden">
          {t("paymentMethodsFormLoading")}
        </span>
        <div className="schematic-skeleton">
          <div className="schematic-skeleton__row">
            <div className="schematic-skeleton__cell" data-column="field" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="schematic-payment-methods__form" data-state="error">
        <p
          className="schematic-error schematic-small schematic-payment-methods__form-error"
          role="alert"
        >
          {t(state.errorKey)}
        </p>
        {onSelectExisting !== undefined && (
          <SelectExisting t={t} onSelectExisting={onSelectExisting} />
        )}
      </div>
    );
  }

  const { Elements } = state.ui;
  return (
    <Elements
      stripe={state.stripe}
      options={{
        appearance: state.appearance,
        clientSecret: state.clientSecret,
      }}
    >
      <Fields
        t={t}
        ui={state.ui}
        onSaved={onSaved}
        onSelectExisting={onSelectExisting}
      />
    </Elements>
  );
}

/**
 * Inside `<Elements>`, where Stripe's hooks resolve. The hooks come from the
 * module loaded above, so they are called off `ui` rather than imported.
 */
function Fields({
  onSaved,
  onSelectExisting,
  t,
  ui,
}: {
  onSaved: (paymentMethodId: string) => Promise<void>;
  onSelectExisting?: () => void;
  t: Translator;
  ui: StripeUi;
}) {
  const { PaymentElement, useElements, useStripe } = ui;
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Save waits for fields Stripe calls complete, as the embed's does.
  const [complete, setComplete] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // A blocked iframe never reports ready or failed, so a quiet one is taken
  // as blocked once the embed's wait runs out.
  useEffect(() => {
    if (ready) {
      return;
    }
    const timer = setTimeout(() => setLoadFailed(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (stripe === null || elements === null || saving) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        // Most methods confirm in place; one that must redirect comes back
        // to this page, where the list refetches on its own.
        redirect: "if_required",
      });
      if (result.error !== undefined) {
        // Stripe's wording where it speaks to the customer, the embed's
        // otherwise.
        const { message: stripeMessage, type } = result.error;
        setMessage(
          (type === "card_error" || type === "validation_error") &&
            stripeMessage !== undefined
            ? stripeMessage
            : t("paymentMethodsSaveError"),
        );
        return;
      }
      const method = result.setupIntent.payment_method;
      const id = typeof method === "string" ? method : (method?.id ?? null);
      if (id === null) {
        setMessage(t("paymentMethodsSaveError"));
        return;
      }
      await onSaved(id);
    } catch {
      setMessage(t("paymentMethodsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="schematic-payment-methods__form"
      data-state="ready"
      onSubmit={(event) => void submit(event)}
    >
      <div className="schematic-payment-methods__fields">
        <PaymentElement
          onChange={(event) => setComplete(event.complete)}
          onLoadError={() => setLoadFailed(true)}
          onReady={() => {
            setReady(true);
            setLoadFailed(false);
          }}
        />
      </div>
      {loadFailed && (
        <p
          className="schematic-error schematic-small schematic-payment-methods__form-error"
          role="alert"
        >
          {t("paymentMethodsFormError")}
        </p>
      )}
      {message !== null && (
        <p
          className="schematic-error schematic-small schematic-payment-methods__form-error"
          role="alert"
        >
          {message}
        </p>
      )}
      <button
        className="schematic-cta schematic-payment-methods__save"
        disabled={stripe === null || elements === null || saving || !complete}
        type="submit"
      >
        {saving ? t("paymentMethodsSaving") : t("paymentMethodsSave")}
      </button>
      {onSelectExisting !== undefined && (
        <SelectExisting
          disabled={saving}
          t={t}
          onSelectExisting={onSelectExisting}
        />
      )}
    </form>
  );
}

/** Back to the method on file; offered only when there is one. */
function SelectExisting({
  disabled = false,
  onSelectExisting,
  t,
}: {
  disabled?: boolean;
  onSelectExisting: () => void;
  t: Translator;
}) {
  return (
    <button
      className="schematic-link-button schematic-payment-methods__select-existing"
      disabled={disabled}
      type="button"
      onClick={onSelectExisting}
    >
      {t("paymentMethodsSelectExisting")}
    </button>
  );
}

export default PaymentMethodForm;
