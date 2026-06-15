// Pure mapping from a payment method to its display fields. Lives in the
// headless layer (returns icon *name* strings, not styled icons) so both the
// `PaymentMethod.Label` primitive and the styled `PaymentMethodElement` share
// one implementation without pulling styled-components or icons in here.

import { type PaymentMethodResponseData } from "../../api/checkoutexternal";

export interface PaymentMethodDisplayData {
  iconName?: string;
  iconTitle?: string;
  label?: string;
  paymentLast4?: string | null;
}

type PaymentMethodType =
  | "card"
  | "us_bank_account"
  | "amazon_pay"
  | "cashapp"
  | "paypal"
  | "link"
  | string;

export function getPaymentMethodData({
  accountLast4,
  accountName,
  bankName,
  billingName,
  billingEmail,
  cardBrand,
  cardLast4,
  paymentMethodType,
}: PaymentMethodResponseData): PaymentMethodDisplayData {
  const cardBrands = new Set(["visa", "mastercard", "amex"]);
  const cardIcon = (icon?: string | null) =>
    icon && cardBrands.has(icon) ? icon : "credit";

  const genericLabel =
    billingName || billingEmail || accountName || bankName || "Payment method";

  const payments: Record<PaymentMethodType, PaymentMethodDisplayData> = {
    card: {
      iconName: cardIcon(cardBrand),
      iconTitle: cardBrand || "Card",
      label: "Card ending in",
      paymentLast4: cardLast4,
    },
    us_bank_account: {
      iconName: "bank",
      iconTitle: `${billingEmail} | ${bankName}`,
      label: bankName || billingEmail || "Bank account",
      paymentLast4: accountLast4,
    },
    amazon_pay: {
      iconName: "amazonpay",
      iconTitle: billingName || billingEmail || "Amazon Pay account",
      label: billingName || billingEmail || "Amazon Pay account",
    },
    cashapp: {
      iconName: "cashapp",
      iconTitle: accountName || billingEmail || "CashApp account",
      label: accountName || billingEmail || "CashApp account",
    },
    paypal: {
      iconName: "paypal",
      iconTitle: accountName || billingEmail || "PayPal account",
      label: accountName || billingEmail || "PayPal account",
    },
    link: {
      iconName: "link",
      iconTitle: billingEmail || accountName || "Link account",
      label: billingEmail || accountName || "Link account",
    },
  };

  return (
    payments[paymentMethodType || ""] ?? {
      iconName: "generic-payment",
      iconTitle: genericLabel,
      label: genericLabel,
    }
  );
}
