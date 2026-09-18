import type { PaymentMethod } from "@schematichq/schematic-react";

import { formatMonthYear } from "./format";

/**
 * `derivePaymentMethods`: the company's saved payment methods as rows — what
 * each one is, how to tell it apart from the others, and whether a card is
 * about to stop working.
 *
 * The provider's vocabulary stays here. A row says "Visa ···· 4242" and
 * "expires soon"; the element never reads `card_brand` or does calendar
 * arithmetic.
 */

export type PaymentMethodKind = "card" | "bank" | "wallet" | "other";

/**
 * `expired` once the card's last month has passed; `soon` when it ends
 * within four months, which is when a provider starts declining renewals;
 * `none` for a method that does not expire.
 */
export type PaymentMethodExpiry = "ok" | "soon" | "expired" | "none";

export interface PaymentMethodRow {
  id: string;
  /** The provider's id, which is what "make default" is asked with. */
  externalId: string;
  kind: PaymentMethodKind;
  /**
   * The whole name of the method: "Visa", "Chase", "Link · jo@example.com".
   * What a row shows beside its last four digits.
   */
  label: string;
  /** The brand or provider alone: "Visa", "Bank account", "Link". */
  brandText: string;
  /** The raw brand for a card, else the raw type; for `[data-brand]`. */
  brand: string;
  /** The wire type as sent: `card`, `us_bank_account`, `link`, … */
  type: string;
  /** Digits that tell this method from another of the same brand. */
  last4: string | null;
  /** "08/2027", or empty when the method has no expiry. */
  expiresText: string;
  expiry: PaymentMethodExpiry;
  isDefault: boolean;
  /** The server's answer, which already applies the last-method rules. */
  canRemove: boolean;
}

export interface DerivePaymentMethodsOptions {
  locale: string;
  /** The moment expiry is judged from. Default: the current time. */
  now?: Date;
}

/** Months from `now`'s month to the expiry month; four is the warning window. */
const SOON_MONTHS = 4;

const CARD_BRANDS: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  eftpos_au: "eftpos",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

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

/** "us_bank_account" → "Us Bank Account"; a type nobody mapped still reads. */
function words(type: string): string {
  return type
    .split(/[_\s-]+/)
    .filter((word) => word !== "")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function cardBrandText(brand: string | null): string {
  if (brand === null) {
    return "Card";
  }
  return CARD_BRANDS[brand.toLowerCase()] ?? words(brand);
}

function isBank(type: string): boolean {
  return type === "us_bank_account" || type.endsWith("_debit");
}

/**
 * A card is good through the last day of its expiry month, so the month
 * count is what matters and the day of the month never does.
 */
function expiryOf(
  month: number | null | undefined,
  year: number | null | undefined,
  now: Date,
): PaymentMethodExpiry {
  if (
    month === undefined ||
    month === null ||
    year === undefined ||
    year === null ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return "none";
  }
  const monthsLeft =
    (year - now.getUTCFullYear()) * 12 + (month - (now.getUTCMonth() + 1));
  if (monthsLeft < 0) {
    return "expired";
  }
  return monthsLeft < SOON_MONTHS ? "soon" : "ok";
}

export function derivePaymentMethods(
  methods: PaymentMethod[],
  options: DerivePaymentMethodsOptions,
): PaymentMethodRow[] {
  const { locale, now = new Date() } = options;
  return methods.map((method) => {
    const type = method.type;
    const cardBrand = orNull(method.cardBrand);
    const expiry = expiryOf(method.cardExpMonth, method.cardExpYear, now);
    const expiresText =
      expiry === "none"
        ? ""
        : formatMonthYear(
            method.cardExpMonth as number,
            method.cardExpYear as number,
            locale,
          );
    const base = {
      id: method.id,
      externalId: method.externalId,
      type,
      expiresText,
      expiry,
      isDefault: method.isDefault,
      canRemove: method.canRemove,
    };

    if (type === "card") {
      const brandText = cardBrandText(cardBrand);
      return {
        ...base,
        kind: "card",
        label: brandText,
        brandText,
        brand: cardBrand?.toLowerCase() ?? type,
        last4: orNull(method.cardLast4),
      };
    }

    if (isBank(type)) {
      const brandText = orNull(method.bankName) ?? "Bank account";
      return {
        ...base,
        kind: "bank",
        label: brandText,
        brandText,
        brand: type,
        last4: orNull(method.accountLast4),
      };
    }

    const wallet = WALLETS[type];
    if (wallet !== undefined) {
      // The account behind a wallet is what tells two of them apart: the
      // Link email, the PayPal account name.
      const detail = orNull(method.accountName) ?? orNull(method.billingEmail);
      return {
        ...base,
        kind: "wallet",
        label: detail === null ? wallet : `${wallet} · ${detail}`,
        brandText: wallet,
        brand: type,
        // Apple Pay and Google Pay wrap a card, and report its digits.
        last4: orNull(method.cardLast4),
      };
    }

    const brandText = words(type);
    return {
      ...base,
      kind: "other",
      label: brandText,
      brandText,
      brand: type,
      last4: null,
    };
  });
}
