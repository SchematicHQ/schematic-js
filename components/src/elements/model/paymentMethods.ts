import type { PaymentMethod } from "@schematichq/schematic-react";

import type { StringKey } from "../strings";

/**
 * `derivePaymentMethods`: the company's saved payment methods as rows, with
 * the default singled out — it is the one the card shows — and the rest
 * beside it, plus whether the default card is about to stop working.
 *
 * The provider's vocabulary stays here. A row says "Card ending in" and
 * "8/27"; the element never reads `card_brand` or does calendar arithmetic.
 */

export type PaymentMethodKind = "card" | "bank" | "wallet" | "other";

/**
 * `expired` once a card's month has arrived (the embed's rule: a card in its
 * last month already reads as expired); `soon` when fewer than four months
 * remain, which is when a provider starts declining renewals; `none` for a
 * method that does not expire.
 */
export type PaymentMethodExpiry = "ok" | "soon" | "expired" | "none";

/** The header's warning: the default card's `expiry`, with nothing to warn
 * of folded to `none`. */
export type PaymentMethodExpiryWarning = "none" | "soon" | "expired";

/** The copy a row's label can ask for; each is a string key the host can
 * translate. */
export type PaymentMethodLabelKey = Extract<
  StringKey,
  | "paymentMethodsCardEndingIn"
  | "paymentMethodsApplePayEndingIn"
  | "paymentMethodsGooglePayEndingIn"
  | "paymentMethodsBankAccount"
  | "paymentMethodsGeneric"
>;

/**
 * What names a method. A `key` is copy to resolve through the translator
 * ("Card ending in"); `text` is a value the provider supplied — a bank's
 * name, the email behind a Link account — or a brand name, which is not
 * translated.
 */
export type PaymentMethodLabel =
  | { key: PaymentMethodLabelKey; text?: undefined }
  | { text: string; key?: undefined };

/**
 * The glyph beside a row's label, by its name in the schematic-icons font:
 * the card network where the font has its mark, a generic card otherwise,
 * the wallet's own mark, a bank for any account, and `generic-payment` for
 * a type nobody mapped. The element renders it as
 * `schematic-icon schematic-icon--<icon>`.
 */
export type PaymentMethodIcon =
  | "visa"
  | "mastercard"
  | "amex"
  | "credit"
  | "bank"
  | "applepay"
  | "google"
  | "cashapp"
  | "paypal"
  | "link"
  | "amazonpay"
  | "generic-payment";

export interface PaymentMethodRow {
  id: string;
  /** The provider's id, which is what "set default" is asked with. */
  externalId: string;
  kind: PaymentMethodKind;
  label: PaymentMethodLabel;
  icon: PaymentMethodIcon;
  /** The raw card brand, else the raw type; for `[data-brand]`. */
  brand: string;
  /** The wire type as sent: `card`, `us_bank_account`, `link`, … */
  type: string;
  /** Digits that follow the label: "Card ending in" 4444. */
  last4: string | null;
  /** "8/27", the way the embed writes a card's expiry; null when the method
   * has none. */
  expiresShort: string | null;
  /** Whole months from the current month to the expiry month; null when the
   * method has none. Zero or less is expired. */
  monthsToExpiration: number | null;
  expiry: PaymentMethodExpiry;
  isDefault: boolean;
  /** The server's answer, which already applies the last-method rules. */
  canRemove: boolean;
}

export interface DerivedPaymentMethods {
  /** Every method, in the order the server gave. */
  rows: PaymentMethodRow[];
  /** The default — the one the card shows — or null when none is. */
  current: PaymentMethodRow | null;
  /** Every row but the default; all of them when there is no default. */
  others: PaymentMethodRow[];
  /** The default card's months left, for the header's warning. */
  monthsToExpiration: number | null;
  expiryWarning: PaymentMethodExpiryWarning;
}

export interface DerivePaymentMethodsOptions {
  /** Reserved for a formatted expiry; the short form is locale-free. */
  locale: string;
  /** The moment expiry is judged from. Default: the current time. */
  now?: Date;
}

/** Fewer than this many months left is the warning window. */
const SOON_MONTHS = 4;

const WALLETS: Record<string, string> = {
  amazon_pay: "Amazon Pay",
  apple_pay: "Apple Pay",
  cashapp: "Cash App",
  google_pay: "Google Pay",
  link: "Link",
  paypal: "PayPal",
};

/** A missing value arrives as null, undefined, or an empty string. */
function orNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

function isBank(type: string): boolean {
  return type === "us_bank_account" || type.endsWith("_debit");
}

function isMonth(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  );
}

function isYear(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Whole calendar months from `now`'s month to the expiry month, the way the
 * embed counts them: the day of either month never matters.
 */
function monthsUntil(month: number, year: number, now: Date): number {
  return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
}

function expiryOf(months: number | null): PaymentMethodExpiry {
  if (months === null) {
    return "none";
  }
  if (months >= SOON_MONTHS) {
    return "ok";
  }
  return months > 0 ? "soon" : "expired";
}

/** "8/27": the month as written, the year's last two digits. */
function shortExpiry(month: number, year: number): string {
  return `${month}/${String(year).slice(-2)}`;
}

/** The embed's label for each type, as a key where the words need
 * translating and as text where the provider supplied them. */
function labelOf(
  method: PaymentMethod,
  kind: PaymentMethodKind,
  last4: string | null,
): PaymentMethodLabel {
  const { type } = method;
  const accountName = orNull(method.accountName);
  const bankName = orNull(method.bankName);
  const billingEmail = orNull(method.billingEmail);
  const billingName = orNull(method.billingName);

  if (kind === "card") {
    return last4 === null
      ? { key: "paymentMethodsGeneric" }
      : { key: "paymentMethodsCardEndingIn" };
  }
  if (kind === "bank") {
    const name = bankName ?? billingEmail;
    return name === null
      ? { key: "paymentMethodsBankAccount" }
      : { text: name };
  }
  if (kind === "wallet") {
    const wallet = WALLETS[type];
    if (type === "apple_pay" && last4 !== null) {
      return { key: "paymentMethodsApplePayEndingIn" };
    }
    if (type === "google_pay" && last4 !== null) {
      return { key: "paymentMethodsGooglePayEndingIn" };
    }
    // The account behind a wallet is what tells two of them apart: the
    // Link email, the PayPal account name. Link is known by its email
    // first; the others by their account name.
    const detail =
      type === "link"
        ? (billingEmail ?? accountName)
        : type === "amazon_pay"
          ? (billingName ?? billingEmail)
          : (accountName ?? billingEmail);
    return { text: detail ?? wallet };
  }
  const generic = billingName ?? billingEmail ?? accountName ?? bankName;
  return generic === null
    ? { key: "paymentMethodsGeneric" }
    : { text: generic };
}

function kindOf(type: string): PaymentMethodKind {
  if (type === "card") {
    return "card";
  }
  if (isBank(type)) {
    return "bank";
  }
  return WALLETS[type] === undefined ? "other" : "wallet";
}

/** The card networks the font has a mark for; any other card is `credit`. */
const CARD_ICONS: Record<string, PaymentMethodIcon> = {
  amex: "amex",
  mastercard: "mastercard",
  visa: "visa",
};

const WALLET_ICONS: Record<string, PaymentMethodIcon> = {
  amazon_pay: "amazonpay",
  apple_pay: "applepay",
  cashapp: "cashapp",
  google_pay: "google",
  link: "link",
  paypal: "paypal",
};

/** The embed's icon map, keyed the same way: brand for a card, type for
 * the rest. */
function iconOf(
  type: string,
  kind: PaymentMethodKind,
  brand: string,
): PaymentMethodIcon {
  if (kind === "card") {
    return CARD_ICONS[brand] ?? "credit";
  }
  if (kind === "bank") {
    return "bank";
  }
  return WALLET_ICONS[type] ?? "generic-payment";
}

function last4Of(
  method: PaymentMethod,
  kind: PaymentMethodKind,
): string | null {
  // Apple Pay and Google Pay wrap a card, and report its digits.
  if (kind === "card" || kind === "wallet") {
    return orNull(method.cardLast4);
  }
  return kind === "bank" ? orNull(method.accountLast4) : null;
}

function deriveRow(method: PaymentMethod, now: Date): PaymentMethodRow {
  const kind = kindOf(method.type);
  const last4 = last4Of(method, kind);
  const cardBrand = orNull(method.cardBrand);
  const { cardExpMonth: month, cardExpYear: year } = method;
  const hasExpiry = isMonth(month) && isYear(year);
  const monthsToExpiration = hasExpiry ? monthsUntil(month, year, now) : null;
  const brand =
    kind === "card" && cardBrand !== null
      ? cardBrand.toLowerCase()
      : method.type;
  return {
    id: method.id,
    externalId: method.externalId,
    kind,
    label: labelOf(method, kind, last4),
    icon: iconOf(method.type, kind, brand),
    brand,
    type: method.type,
    last4,
    expiresShort: hasExpiry ? shortExpiry(month, year) : null,
    monthsToExpiration,
    expiry: expiryOf(monthsToExpiration),
    isDefault: method.isDefault,
    canRemove: method.canRemove,
  };
}

/**
 * The default is whichever row the server marked, which already prefers the
 * subscription's method over the customer's. Nothing is promoted: a list
 * with no default has no `current`, and every row is among the `others`.
 */
export function derivePaymentMethods(
  methods: PaymentMethod[],
  options: DerivePaymentMethodsOptions,
): DerivedPaymentMethods {
  const { now = new Date() } = options;
  const rows = methods.map((method) => deriveRow(method, now));
  const current = rows.find((row) => row.isDefault) ?? null;
  const others = rows.filter((row) => row !== current);
  const monthsToExpiration = current?.monthsToExpiration ?? null;
  const expiry = current?.expiry ?? "none";
  return {
    rows,
    current,
    others,
    monthsToExpiration,
    expiryWarning: expiry === "soon" || expiry === "expired" ? expiry : "none",
  };
}
