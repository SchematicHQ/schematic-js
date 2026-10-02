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

  includedFeaturesLoading: string;
  includedFeaturesHeader: string;
  includedFeaturesError: string;
  includedFeaturesUnavailable: string;
  includedFeaturesSeeAll: string;
  includedFeaturesHideAll: string;
  includedFeaturesExpires: string;
  includedFeaturesPerLicense: string;

  meteredFeaturesLoading: string;
  meteredFeaturesError: string;
  meteredFeaturesUnavailable: string;
  meteredFeaturesUsed: string;
  meteredFeaturesIncluded: string;
  meteredFeaturesInUse: string;
  meteredFeaturesLimitOf: string;
  meteredFeaturesNoLimit: string;
  meteredFeaturesAddMore: string;
  meteredFeaturesAdditional: string;
  meteredFeaturesTier: string;

  creditUsageLoading: string;
  creditUsageHeader: string;
  creditUsageError: string;
  creditUsageUnavailable: string;
  creditUsageRemaining: string;
  creditUsageBuyMore: string;
  creditUsageSeeDetails: string;
  creditUsageHideDetails: string;
  creditUsageSeeAll: string;
  creditUsageHideAll: string;
  creditUsageGrantPlan: string;
  creditUsageGrantBundle: string;
  creditUsageGrantAutoTopup: string;
  creditUsageGrantPromotional: string;
  creditUsageResets: string;
  creditUsageExpires: string;
  creditUsageComposition: string;
  creditUsagePerLicense: string;
  creditUsageCompanyGrant: string;
  creditUsageRenewsOn: string;

  planManagerLoading: string;
  planManagerError: string;
  planManagerUnavailable: string;
  planManagerTrialEndsIn: string;
  planManagerDays: string;
  planManagerHours: string;
  planManagerMinutes: string;
  planManagerSeconds: string;
  planManagerCanceled: string;
  planManagerAccessEnds: string;
  planManagerPlanFallback: string;
  planManagerCustomAwaiting: string;
  planManagerCustomAwaitingDescription: string;
  planManagerCustomDue: string;
  planManagerCustomDueDescription: string;
  planManagerYourPlan: string;
  planManagerPayNow: string;
  planManagerDowngradeScheduled: string;
  planManagerUsageBased: string;
  planManagerFree: string;
  planManagerAddOns: string;
  planManagerAdditional: string;
  planManagerTierBased: string;
  planManagerCreditsInPlan: string;
  planManagerTopUps: string;
  planManagerCreditBundles: string;
  planManagerPromotionalCredits: string;
  planManagerChangePlan: string;
  planManagerCredits: string;
  planManagerCreditsPerPeriod: string;
  planManagerCreditsPerLicense: string;
  planManagerCreditsPlusPerPeriod: string;
  planManagerLicensesTimesCredits: string;
  planManagerLicensesTimesCreditsPlusCompany: string;
  planManagerUsed: string;
  planManagerAutoTopup: string;
  planManagerAutoTopupDisabled: string;
  planManagerAutoTopupAdds: string;
  planManagerAutoTopupTip: string;
  planManagerEdit: string;
  planManagerSeeAll: string;
  planManagerHideAll: string;

  usageByUserHeader: string;
  usageByUserTotal: string;
  usageByUserError: string;
  usageByUserUnattributed: string;
  usageByUserMore: string;
  usageByUserShowTop: string;
  usageByUserShowAllCount: string;
  usageByUserShowAll: string;
  usageByUserShowFewer: string;

  usageUnits: string;
  usagePerUnit: string;
  usagePerPackage: string;
  usageTierUpTo: string;
  usageTierUnlimited: string;
  usagePerUse: string;
  usageUnlimited: string;
  usageUnitPricePerPeriod: string;
  usagePackagePricePerPeriod: string;
  usageUsed: string;
  usageResets: string;
  usageLimited: string;
  usageUnlimitedUsed: string;
  usageHardLimitLabel: string;
  usageHardLimit: string;
  usageTieredPricingLabel: string;
  usageTiersVolume: string;
  usageTiersGraduated: string;
  periodMonthShort: string;
  periodQuarterShort: string;
  periodYearShort: string;
  periodDay: string;
  periodWeek: string;
  periodMonth: string;
  periodQuarter: string;
  periodYear: string;
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

  includedFeaturesLoading: "Loading features",
  includedFeaturesHeader: "Included features",
  includedFeaturesError: "There was a problem retrieving your features.",
  includedFeaturesUnavailable: "Features are not available for this account.",
  includedFeaturesSeeAll: "See all",
  includedFeaturesHideAll: "Hide all",
  includedFeaturesExpires: "Expires {{date}}",
  includedFeaturesPerLicense:
    "Includes {{amount}} {{creditName}} per {{licenseName}}",

  meteredFeaturesLoading: "Loading usage",
  meteredFeaturesError: "There was a problem retrieving your usage.",
  meteredFeaturesUnavailable: "Usage is not available for this account.",
  meteredFeaturesUsed: "{{amount}} {{units}} used",
  meteredFeaturesIncluded: "{{amount}} included",
  meteredFeaturesInUse: "{{amount}} used",
  meteredFeaturesLimitOf: "Limit of {{amount}}",
  meteredFeaturesNoLimit: "No limit",
  meteredFeaturesAddMore: "Add More",
  meteredFeaturesAdditional: "Additional",
  meteredFeaturesTier: "Tier",

  creditUsageLoading: "Loading credits",
  creditUsageHeader: "Credits",
  creditUsageError: "There was a problem retrieving your credits.",
  creditUsageUnavailable: "Credits are not available for this account.",
  creditUsageRemaining: "{{amount}} {{units}} remaining",
  creditUsageBuyMore: "Buy More",
  creditUsageSeeDetails: "See balance details",
  creditUsageHideDetails: "Hide balance details",
  creditUsageSeeAll: "See all ({{total}})",
  creditUsageHideAll: "Hide all",
  creditUsageGrantPlan: "{{amount}} {{item}} included in plan",
  creditUsageGrantBundle: "{{amount}} {{item}} bundle purchased {{createdAt}}",
  creditUsageGrantAutoTopup:
    "{{amount}} {{item}} auto-topup purchased {{createdAt}}",
  creditUsageGrantPromotional:
    "{{amount}} promotional {{item}} granted {{createdAt}}",
  creditUsageResets: "Resets {{date}}",
  creditUsageExpires: "Expires {{date}}",
  creditUsageComposition:
    "Your plan includes {{total}} {{creditName}}/{{period}}{{composition}}.",
  creditUsagePerLicense: "{{quantity}} {{licenseName}} × {{perUnit}}",
  creditUsageCompanyGrant: "{{amount}} company grant",
  creditUsageRenewsOn: "Renews on the {{day}}.",

  planManagerLoading: "Loading your plan",
  planManagerError: "There was a problem retrieving your plan.",
  planManagerUnavailable: "Your plan is not available for this account.",
  planManagerTrialEndsIn: "Trial ends in {{amount}} {{units}}",
  // The trial countdown's units, looked up by the bare key with `{ count }`.
  planManagerDays: "days",
  planManagerDays_one: "day",
  planManagerDays_other: "days",
  planManagerHours: "hours",
  planManagerHours_one: "hour",
  planManagerHours_other: "hours",
  planManagerMinutes: "minutes",
  planManagerMinutes_one: "minute",
  planManagerMinutes_other: "minutes",
  planManagerSeconds: "seconds",
  planManagerSeconds_one: "second",
  planManagerSeconds_other: "seconds",
  planManagerCanceled: "Subscription canceled",
  planManagerAccessEnds: "Access to {{plan}} will end on {{date}}.",
  planManagerPlanFallback: "plan",
  planManagerCustomAwaiting: "Pay to activate {{plan}}",
  planManagerCustomAwaitingDescription:
    "Pay the invoice to activate your custom plan. Due by {{date}}.",
  planManagerCustomDue: "Pay by {{date}} to keep {{plan}}",
  planManagerCustomDueDescription:
    "Access to {{plan}} will end on {{date}} unless the invoice is paid.",
  planManagerYourPlan: "your plan",
  planManagerPayNow: "Pay now",
  planManagerDowngradeScheduled: "Downgrade to {{plan}} scheduled",
  planManagerUsageBased: "Usage-based",
  planManagerFree: "Free",
  planManagerAddOns: "Add-ons",
  planManagerAdditional: "Additional",
  planManagerTierBased: "Tier-based",
  planManagerCreditsInPlan: "Credits in plan",
  planManagerTopUps: "Top-ups",
  planManagerCreditBundles: "Credit bundles",
  planManagerPromotionalCredits: "Promotional credits",
  planManagerChangePlan: "Change plan",
  planManagerCredits: "{{amount}} {{creditName}}",
  planManagerCreditsPerPeriod: "{{amount}} {{creditName}} per {{period}}",
  planManagerCreditsPerLicense: "{{amount}} {{creditName}} per {{licenseName}}",
  planManagerCreditsPlusPerPeriod: "+ {{amount}} {{creditName}} per {{period}}",
  planManagerLicensesTimesCredits:
    "{{quantity}} {{licenseName}} × {{perUnit}} = {{total}} {{creditName}}/{{period}}",
  planManagerLicensesTimesCreditsPlusCompany:
    "{{quantity}} {{licenseName}} × {{perUnit}} + {{fixed}} = {{total}} {{creditName}}/{{period}}",
  planManagerUsed: "{{amount}} used",
  planManagerAutoTopup: "Auto top-up",
  planManagerAutoTopupDisabled: "Auto top-up disabled for {{unit}}",
  planManagerAutoTopupAdds:
    "Adds {{amount}} {{unit}} when {{threshold}} remaining in balance",
  planManagerAutoTopupTip:
    "When credit balance reaches {{threshold}} remaining, an auto top-up of {{amount}} credits will be processed.",
  planManagerEdit: "Edit",
  planManagerSeeAll: "See all ({{total}})",
  planManagerHideAll: "Hide all",

  usageByUserHeader: "Usage by user",
  usageByUserTotal: "{{amount}} used by your team this period",
  usageByUserError: "There was a problem retrieving usage by user.",
  usageByUserUnattributed: "Unattributed",
  // Looked up by the bare key with `{ count }`; `shown` is the count formatted.
  usageByUserMore: "plus {{shown}} more",
  usageByUserShowTop: "Show top {{shown}} users",
  usageByUserShowTop_one: "Show top {{shown}} user",
  usageByUserShowTop_other: "Show top {{shown}} users",
  usageByUserShowAllCount: "Show all {{shown}} users",
  usageByUserShowAllCount_one: "Show all {{shown}} user",
  usageByUserShowAllCount_other: "Show all {{shown}} users",
  usageByUserShowAll: "Show all",
  usageByUserShowFewer: "Show fewer",

  // Shared by the usage elements.
  usageUnits: "{{amount}} {{units}}",
  usagePerUnit: "{{cost}} per {{unit}}",
  usagePerPackage: "{{cost}} per {{size}} {{units}}",
  usageTierUpTo: "Up to {{amount}} {{feature}} in this tier",
  usageTierUnlimited: "Unlimited {{feature}} in this tier",
  usagePerUse: "{{amount}} {{units}} per use",
  usageUnlimited: "Unlimited {{item}}",
  usageUnitPricePerPeriod: "{{cost}}/{{unit}}/{{period}}",
  usagePackagePricePerPeriod: "{{cost}}/{{size}} {{units}}/{{period}}",
  usageUsed: "{{amount}} {{units}} used",
  usageResets: "Resets {{date}}",
  usageLimited: "{{amount}} of {{allocation}} used",
  usageUnlimitedUsed: "{{amount}} used",
  usageHardLimitLabel: "Limit",
  usageHardLimit: "Up to a limit of {{amount}} {{units}}",
  usageTieredPricingLabel: "Tiered pricing",
  usageTiersVolume: "Price by unit based on final tier reached.",
  usageTiersGraduated: "Tiers apply progressively as quantity increases.",
  periodMonthShort: "mo",
  periodQuarterShort: "qtr",
  periodYearShort: "yr",
  periodDay: "day",
  periodWeek: "week",
  periodMonth: "month",
  periodQuarter: "quarter",
  periodYear: "year",
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
