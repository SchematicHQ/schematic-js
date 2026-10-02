import type { Translate } from "@schematichq/schematic-react";

/**
 * The elements ship English only. A host overrides copy through `strings`
 * or routes it through its own `translate`, which then owns plurals and
 * interpolation.
 */

/** The defaults are English, so their plural forms resolve under English rules. */
export const DEFAULT_STRINGS_LOCALE = "en";

/**
 * Only the copy the elements render. A host building its own markup owns its
 * own labels and headers; those are not keys here.
 *
 * Plural forms follow i18next's `key_one` / `key_other` convention, looked
 * up by the bare `key` with `{ count }`.
 */
export type ElementStrings = {
  retry: string;

  invoicesLoading: string;
  invoicesHeader: string;
  invoicesError: string;
  invoicesUnavailable: string;
  invoicesEmpty: string;
  invoicesSeeMore: string;
  invoicesSeeLess: string;
  invoicesLoadMore: string;
  invoicesChargeTooltip: string;
  invoicesCreditTooltip: string;
  invoicesUndated: string;

  upcomingBillLoading: string;
  upcomingBillHeader: string;
  upcomingBillError: string;
  upcomingBillUnavailable: string;
  upcomingBillEmpty: string;
  upcomingBillEstimate: string;
  upcomingBillBalanceApplied: string;
  upcomingBillBalanceRemaining: string;
  upcomingBillDiscount: string;
  upcomingBillDiscountValue: string;
  upcomingBillDiscountRepeating: string;

  paymentMethodsLoading: string;
  paymentMethodsHeader: string;
  paymentMethodsError: string;
  paymentMethodsUnavailable: string;
  paymentMethodsEmpty: string;
  paymentMethodsEdit: string;
  paymentMethodsAdd: string;
  paymentMethodsExpiresInMonths: string;
  paymentMethodsExpired: string;
  paymentMethodsCardEndingIn: string;
  paymentMethodsApplePayEndingIn: string;
  paymentMethodsGooglePayEndingIn: string;
  paymentMethodsApplePay: string;
  paymentMethodsGooglePay: string;
  paymentMethodsAmazonPayAccount: string;
  paymentMethodsCashAppAccount: string;
  paymentMethodsPayPalAccount: string;
  paymentMethodsLinkAccount: string;
  paymentMethodsBankAccount: string;
  paymentMethodsGeneric: string;
  paymentMethodsDialogTitle: string;
  paymentMethodsClose: string;
  paymentMethodsChooseDifferent: string;
  paymentMethodsExpires: string;
  paymentMethodsSetDefault: string;
  paymentMethodsRemove: string;
  paymentMethodsAddNew: string;
  paymentMethodsSelectExisting: string;
  paymentMethodsFormLoading: string;
  paymentMethodsFormError: string;
  paymentMethodsEmail: string;
  paymentMethodsEmailPlaceholder: string;
  paymentMethodsSetupError: string;
  paymentMethodsSave: string;
  paymentMethodsSaving: string;
  paymentMethodsSaveError: string;
  paymentMethodsSetDefaultError: string;
  paymentMethodsRemoveError: string;

  checkoutTitle: string;
  checkoutClose: string;
  checkoutLoading: string;
  checkoutError: string;
  checkoutUnavailable: string;
  checkoutStepsLabel: string;
  checkoutStepPlan: string;
  checkoutStepAutoTopup: string;
  checkoutStepUsage: string;
  checkoutStepAddOns: string;
  checkoutStepAddOnUsage: string;
  checkoutStepCredits: string;
  checkoutStepPayment: string;
  checkoutNext: string;
  checkoutBack: string;
  checkoutPeriodMonth: string;
  checkoutPeriodQuarter: string;
  checkoutPeriodYear: string;
  checkoutPerMonth: string;
  checkoutPerQuarter: string;
  checkoutPerYear: string;
  checkoutPeriodLabel: string;
  checkoutCurrencyLabel: string;
  checkoutFree: string;
  checkoutCurrentPlan: string;
  checkoutSelect: string;
  checkoutSelected: string;
  checkoutTrialDays: string;
  checkoutTrialToggle: string;
  checkoutPlanOverLimit: string;
  checkoutPlanDowngradeBlocked: string;
  checkoutPlanNotPriced: string;
  checkoutAddOnsEmpty: string;
  checkoutAdd: string;
  checkoutRemove: string;
  checkoutQuantityLabel: string;
  checkoutCurrentQuantity: string;
  checkoutPerUnit: string;
  checkoutCreditsCount: string;
  checkoutAutoTopupEnable: string;
  checkoutAutoTopupThreshold: string;
  checkoutAutoTopupAmount: string;
  checkoutAutoTopupCost: string;
  checkoutPaymentMethod: string;
  checkoutUseDifferentMethod: string;
  checkoutPaymentNotRequired: string;
  checkoutPromoCode: string;
  checkoutPromoApply: string;
  checkoutPromoRemove: string;
  checkoutPromoApplied: string;
  checkoutTaxId: string;
  checkoutTaxIdCountry: string;
  checkoutTaxIdType: string;
  checkoutTaxIdValue: string;
  checkoutTaxIdSaved: string;
  checkoutTaxIdError: string;
  checkoutTaxIdFormat: string;
  checkoutCustomFields: string;
  checkoutRequired: string;
  checkoutOptInAccept: string;
  checkoutSummary: string;
  checkoutDueToday: string;
  checkoutTotalPerMonth: string;
  checkoutTotalPerQuarter: string;
  checkoutTotalPerYear: string;
  checkoutProration: string;
  checkoutDiscount: string;
  checkoutTax: string;
  checkoutTrialEnds: string;
  checkoutScheduledChange: string;
  checkoutDisclaimerMonth: string;
  checkoutDisclaimerQuarter: string;
  checkoutDisclaimerYear: string;
  checkoutPricing: string;
  checkoutPricingError: string;
  checkoutPay: string;
  checkoutStartTrial: string;
  checkoutConfirm: string;
  checkoutFinalizing: string;
  checkoutFinalizeError: string;
  checkoutPaymentFailed: string;
};

export type StringKey = keyof ElementStrings;

/** A flat catalogue, the shape of both a host's `strings` and the defaults. */
export type StringCatalog = Record<string, string | undefined>;

/** The i18next plural suffixes a key can carry. */
type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Copy overrides, on the provider or on an element. Plural spellings are
 * accepted so an override can vary by count rather than answering `1` and
 * `14` with the same words.
 */
export type StringOverrides = Partial<ElementStrings> &
  Partial<Record<`${StringKey}_${PluralSuffix}`, string>>;

/** Interpolation values, and `count` for the plural form. */
export type StringVars = Record<string, unknown>;

export type Translator = (key: StringKey, vars?: StringVars) => string;

/**
 * The English copy, and the fallback for anything a host does not answer.
 * It is a plain resource bundle, so it can be registered as one:
 *
 * ```ts
 * i18n.addResourceBundle("en", "schematic", DEFAULT_STRINGS);
 * ```
 *
 * Registering it is optional: the elements render the English themselves on
 * a miss.
 *
 * Also typed as a catalogue so plural variants can sit beside the bare key
 * they inflect.
 */
export const DEFAULT_STRINGS: ElementStrings & StringCatalog = {
  retry: "Try again",

  invoicesLoading: "Loading invoices",
  invoicesHeader: "Invoices",
  invoicesError: "There was a problem retrieving your invoices.",
  invoicesUnavailable: "Invoices are not available for this account.",
  invoicesEmpty: "No invoices created yet",
  invoicesSeeMore: "See more",
  invoicesSeeLess: "See less",
  invoicesLoadMore: "Load more",
  invoicesChargeTooltip: "Charge — you were billed this amount",
  invoicesCreditTooltip:
    "Credit — this amount was returned to your account, typically due to a plan change or proration",
  invoicesUndated: "View invoice",

  upcomingBillLoading: "Loading your next bill",
  upcomingBillHeader: "Next bill due {{date}}",
  upcomingBillError: "There was a problem retrieving your upcoming invoice.",
  upcomingBillUnavailable:
    "Your upcoming invoice is not available for this account.",
  upcomingBillEmpty: "No upcoming invoice",
  upcomingBillEstimate: "Estimated bill",
  upcomingBillBalanceApplied: "Applied balance towards next invoice",
  upcomingBillBalanceRemaining: "Remaining balance after next invoice",
  upcomingBillDiscount: "Discount",
  upcomingBillDiscountValue: "{{value}} off",
  // Looked up by the bare key with `{ count }`; English has two forms.
  upcomingBillDiscountRepeating: "{{value}} off for next {{count}} months",
  upcomingBillDiscountRepeating_one: "{{value}} off for next month",
  upcomingBillDiscountRepeating_other:
    "{{value}} off for next {{count}} months",

  paymentMethodsLoading: "Loading payment methods",
  paymentMethodsHeader: "Payment Details",
  paymentMethodsError: "Could not load payment methods",
  paymentMethodsUnavailable: "Payment methods are not available",
  paymentMethodsEmpty: "No payment method added yet",
  paymentMethodsEdit: "Edit",
  paymentMethodsAdd: "Add",
  paymentMethodsExpiresInMonths: "Expires in {{months}} mo",
  paymentMethodsExpired: "Expired",
  paymentMethodsCardEndingIn: "Card ending in",
  paymentMethodsApplePayEndingIn: "Apple Pay ending in",
  paymentMethodsGooglePayEndingIn: "Google Pay ending in",
  paymentMethodsApplePay: "Apple Pay",
  paymentMethodsGooglePay: "Google Pay",
  paymentMethodsAmazonPayAccount: "Amazon Pay account",
  paymentMethodsCashAppAccount: "CashApp account",
  paymentMethodsPayPalAccount: "PayPal account",
  paymentMethodsLinkAccount: "Link account",
  paymentMethodsBankAccount: "Bank account",
  paymentMethodsGeneric: "Payment method",
  paymentMethodsDialogTitle: "Edit payment details",
  paymentMethodsClose: "Close",
  paymentMethodsChooseDifferent: "Choose different payment method",
  paymentMethodsExpires: "Expires {{date}}",
  paymentMethodsSetDefault: "Set default",
  paymentMethodsRemove: "Remove",
  paymentMethodsAddNew: "Add new payment method",
  paymentMethodsSelectExisting: "Select existing payment method",
  paymentMethodsFormLoading: "Loading payment form",
  paymentMethodsFormError:
    "Unable to load payment form. Your browser's security or privacy settings may be blocking it. Please try a different browser or adjust your privacy settings.",
  paymentMethodsEmail: "Email",
  paymentMethodsEmailPlaceholder: "Enter email address",
  paymentMethodsSetupError:
    "Error initializing payment method change. Please try again.",
  paymentMethodsSave: "Save payment method",
  paymentMethodsSaving: "Loading",
  paymentMethodsSaveError:
    "A problem occurred while saving your payment method.",
  paymentMethodsSetDefaultError:
    "Error updating payment method. Please try again.",
  paymentMethodsRemoveError: "Error deleting payment method. Please try again.",

  checkoutTitle: "Checkout",
  checkoutClose: "Close",
  checkoutLoading: "Loading checkout",
  checkoutError: "There was a problem loading checkout.",
  checkoutUnavailable: "Checkout is not available for this account.",
  checkoutStepsLabel: "Checkout steps",
  checkoutStepPlan: "Plan",
  checkoutStepAutoTopup: "Auto top-up",
  checkoutStepUsage: "Quantity",
  checkoutStepAddOns: "Add-ons",
  checkoutStepAddOnUsage: "Add-on quantity",
  checkoutStepCredits: "Credits",
  checkoutStepPayment: "Checkout",
  checkoutNext: "Next: {{step}}",
  checkoutBack: "Back",
  checkoutPeriodMonth: "Monthly",
  checkoutPeriodQuarter: "Quarterly",
  checkoutPeriodYear: "Yearly",
  checkoutPerMonth: "/month",
  checkoutPerQuarter: "/quarter",
  checkoutPerYear: "/year",
  checkoutPeriodLabel: "Billing period",
  checkoutCurrencyLabel: "Currency",
  checkoutFree: "Free",
  checkoutCurrentPlan: "Current plan",
  checkoutSelect: "Select",
  checkoutSelected: "Selected",
  checkoutTrialDays: "{{count}} day free trial",
  checkoutTrialDays_one: "{{count}} day free trial",
  checkoutTrialDays_other: "{{count}} day free trial",
  checkoutTrialToggle: "Start with a free trial",
  checkoutPlanOverLimit: "Over plan limit",
  checkoutPlanDowngradeBlocked: "Downgrade not permitted",
  checkoutPlanNotPriced: "Not available for this billing period",
  checkoutAddOnsEmpty: "No add-ons are available for this plan.",
  checkoutAdd: "Add",
  checkoutRemove: "Remove",
  checkoutQuantityLabel: "Quantity of {{name}}",
  checkoutCurrentQuantity: "Currently {{count}}",
  checkoutPerUnit: "{{price}} each",
  checkoutCreditsCount: "{{count}} {{credits}}",
  checkoutAutoTopupEnable: "Top up {{credits}} automatically",
  checkoutAutoTopupThreshold: "When the balance falls below",
  checkoutAutoTopupAmount: "Buy",
  checkoutAutoTopupCost: "{{cost}} per top-up",
  checkoutPaymentMethod: "Payment method",
  checkoutUseDifferentMethod: "Use a different payment method",
  checkoutPaymentNotRequired: "No payment is needed today.",
  checkoutPromoCode: "Promo code",
  checkoutPromoApply: "Apply",
  checkoutPromoRemove: "Remove",
  checkoutPromoApplied: "{{code}} applied",
  checkoutTaxId: "Tax ID",
  checkoutTaxIdCountry: "Country",
  checkoutTaxIdType: "Type",
  checkoutTaxIdValue: "Tax ID number",
  checkoutTaxIdSaved: "Tax ID saved",
  checkoutTaxIdError: "There was a problem saving your tax ID.",
  checkoutTaxIdFormat: "Double-check this matches the format {{example}}.",
  checkoutCustomFields: "Additional details",
  checkoutRequired: "Required",
  checkoutOptInAccept: "I agree",
  checkoutSummary: "Summary",
  checkoutDueToday: "Due today",
  checkoutTotalPerMonth: "Total per month",
  checkoutTotalPerQuarter: "Total per quarter",
  checkoutTotalPerYear: "Total per year",
  checkoutProration: "Proration",
  checkoutDiscount: "Discount",
  checkoutTax: "Tax",
  checkoutTrialEnds: "Your trial ends {{date}}; you will be charged then.",
  checkoutScheduledChange: "This change takes effect {{date}}.",
  checkoutDisclaimerMonth: "Renews monthly until cancelled.",
  checkoutDisclaimerQuarter: "Renews quarterly until cancelled.",
  checkoutDisclaimerYear: "Renews yearly until cancelled.",
  checkoutPricing: "Updating price",
  checkoutPricingError: "There was a problem pricing this checkout.",
  checkoutPay: "Pay now",
  checkoutStartTrial: "Start trial",
  checkoutConfirm: "Confirm",
  checkoutFinalizing: "Processing",
  checkoutFinalizeError: "There was a problem completing checkout.",
  checkoutPaymentFailed: "The payment was not completed: {{message}}",
};

/**
 * Passed to a host's `translate` as `defaultValue` so a miss is detectable
 * from a stack that answers every key. The leading NUL is nothing a real
 * catalogue would contain.
 */
export const MISSING_STRING = "\u0000schematic:missing";

/**
 * Fills `{{name}}` placeholders, i18next style. A placeholder with no value
 * is left as written so the omission is visible.
 */
export function interpolate(template: string, vars?: StringVars): string {
  if (vars === undefined || !template.includes("{{")) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? whole : String(value);
  });
}

/** `other` when `Intl` rejects the locale. */
function pluralCategory(count: number, locale: string): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return "other";
  }
}

/**
 * `locale` is the language the catalogue is written in, since that decides
 * its plural forms: English for the defaults, the resolved locale for a
 * host's overrides. Returns `undefined` on a miss so callers can fall
 * through to the next source.
 */
export function lookup(
  catalog: StringCatalog | undefined,
  key: string,
  vars?: StringVars,
  locale: string = DEFAULT_STRINGS_LOCALE,
): string | undefined {
  if (catalog === undefined) {
    return undefined;
  }
  const count = vars?.count;
  const template =
    typeof count === "number"
      ? (catalog[`${key}_${pluralCategory(count, locale)}`] ??
        catalog[`${key}_other`] ??
        catalog[key])
      : catalog[key];
  return template === undefined ? undefined : interpolate(template, vars);
}

/**
 * Bottoms out at the key itself, so the `Translator` return type holds even
 * for a key the catalogue lacks.
 */
export function defaultString(key: StringKey, vars?: StringVars): string {
  return lookup(DEFAULT_STRINGS, key, vars) ?? DEFAULT_STRINGS[key] ?? key;
}

export type { Translate };
