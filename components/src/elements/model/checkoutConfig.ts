import type { CheckoutPeriod } from "./checkoutPrices";

/**
 * What `<Checkout />` opens with and how it walks, as plain data: the props
 * the element takes, and what `useCheckoutLauncher().open(config)` hands it.
 */

/** A step of the checkout, in the order they can appear. */
export type CheckoutStep =
  | "plan"
  | "autoTopup"
  | "usage"
  | "addOns"
  | "addOnUsage"
  | "credits"
  | "payment";

/** Every step but payment can be skipped. */
export type SkippableStep = Exclude<CheckoutStep, "payment">;

/** What the cart starts with. Read when the checkout opens; the customer edits from there. */
export interface CheckoutSelection {
  /**
   * The plan to start on. Left out, the company's current plan — unless it
   * could start a trial on it, when it chooses. `null` is no plan: a
   * purchase of credit bundles alone.
   */
  planId?: string | null;
  /** The billing period. Left out, the subscription's, else monthly. */
  period?: CheckoutPeriod;
  /**
   * ISO 4217, any case. Ignored when the subscription's currency fixes it or
   * the catalog does not sell in it.
   */
  currency?: string;
  /** The add-ons to start with. Left out, the ones the company holds. */
  addOnIds?: string[];
  /**
   * Pay-in-advance quantities, by feature id, for the plan and add-ons alike.
   * Left out, what the company has now; clamped to whole numbers from zero.
   */
  quantities?: Record<string, number>;
  /** Credit bundles by bundle id; a bundle bought one at a time takes any count above zero as one. */
  creditBundles?: Record<string, number>;
  /** Automatic top-ups the company chooses, by plan credit grant id. */
  autoTopup?: Record<string, AutoTopupChoice>;
  promoCode?: string;
  /** Start a trial when the plan offers one and the company can take it. Default true. */
  trial?: boolean;
  /** Custom checkout field values by field id; win over the company's saved ones. */
  customFields?: Record<string, string>;
}

/** A company's own automatic top-up for one of the plan's credits. */
export interface AutoTopupChoice {
  enabled?: boolean;
  thresholdCredits?: number;
  amount?: number;
}

export interface CheckoutSteps {
  /**
   * Steps passed over when their requirement is already met. A step whose
   * requirement is not met — no plan resolves, or a blocking problem points
   * at it — is shown anyway.
   */
  skip?: readonly SkippableStep[];
  /**
   * Leave skipped steps out of the step list. Default false: they stay
   * listed, and choosing one returns to it.
   */
  hideSkipped?: boolean;
  /** Open here, before skipping. A step the checkout does not have falls back to the first. */
  initial?: CheckoutStep;
}

export interface CheckoutDisplay {
  /** Month, quarter and year choices on the plan step. Default true. */
  showPeriodToggle?: boolean;
  /** A currency choice when the catalog sells in more than one. Default true. */
  showCurrencySelector?: boolean;
  /** The line under the total about how the charge renews. Default true. */
  showBillingDisclaimer?: boolean;
  /** The currencies to offer, in order; the first is the default. */
  currencies?: readonly string[];
  /**
   * How the steps and the summary sit. `"auto"` (default): the summary
   * beside the steps from 768px up, under them below. `"stacked"`: under
   * them at every width, and the whole dialog scrolls. The root carries
   * `schematic-checkout--stacked` for a sheet of your own.
   */
  layout?: "auto" | "stacked";
  /**
   * When the summary is shown. `"always"` (default), or `"payment"`: on the
   * payment step alone; the steps before it carry their Next action in
   * `.schematic-checkout__nav`, and the layout carries `data-summary`.
   */
  summary?: "always" | "payment";
}

/** Shared by `<Checkout />` and `useCheckoutLauncher().open(config)`. */
export interface CheckoutConfig {
  selection?: CheckoutSelection;
  steps?: CheckoutSteps;
  display?: CheckoutDisplay;
  /** Read `GET /catalogs/{catalog_id}/view` rather than the environment's catalog. */
  catalogId?: string;
}
