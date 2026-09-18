import type { PaymentMethod } from "@schematichq/schematic-react";

import { derivePaymentMethods } from "./paymentMethods";

const L = "en-US";
/** 21 August 2026, local time: expiry is judged against this month. */
const NOW = new Date(2026, 7, 21, 12, 0, 0);

function method(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: "pm_1",
    externalId: "pm_ext_1",
    type: "card",
    isDefault: false,
    canRemove: true,
    cardBrand: "visa",
    cardLast4: "4444",
    cardExpMonth: 8,
    cardExpYear: 2027,
    ...overrides,
  };
}

function one(overrides: Partial<PaymentMethod> = {}) {
  return derivePaymentMethods([method(overrides)], { locale: L, now: NOW })
    .rows[0];
}

/** A method of another type, with the card fields cleared. */
function typed(type: string, overrides: Partial<PaymentMethod> = {}) {
  return one({
    type,
    cardBrand: null,
    cardLast4: null,
    cardExpMonth: null,
    cardExpYear: null,
    ...overrides,
  });
}

describe("derivePaymentMethods", () => {
  test("a card: the embed's label, its digits, its expiry, and the raw fields", () => {
    expect(one({ id: "pm_9", externalId: "pm_x", isDefault: true })).toEqual({
      id: "pm_9",
      externalId: "pm_x",
      kind: "card",
      type: "card",
      label: { key: "paymentMethodsCardEndingIn" },
      brand: "visa",
      last4: "4444",
      expiresShort: "8/27",
      monthsToExpiration: 12,
      expiry: "ok",
      isDefault: true,
      canRemove: true,
    });
  });

  test("a card's brand is kept lowercased for the data attribute, the type failing that", () => {
    expect(one({ cardBrand: "MasterCard" }).brand).toBe("mastercard");
    expect(one({ cardBrand: null }).brand).toBe("card");
    expect(one({ cardBrand: "" }).brand).toBe("card");
  });

  test("a card with no digits has nothing to end in, so it is a generic method", () => {
    expect(one({ cardLast4: null })).toMatchObject({
      label: { key: "paymentMethodsGeneric" },
      last4: null,
    });
    expect(one({ cardLast4: "" }).last4).toBeNull();
  });

  describe("labels, as the embed writes them", () => {
    test("a bank account: the bank's name and the account's digits", () => {
      expect(
        typed("us_bank_account", { bankName: "Chase", accountLast4: "6789" }),
      ).toMatchObject({
        kind: "bank",
        label: { text: "Chase" },
        brand: "us_bank_account",
        last4: "6789",
        expiresShort: null,
        monthsToExpiration: null,
        expiry: "none",
      });
    });

    test("a bank account with no bank named falls to the email, then to the copy", () => {
      expect(
        typed("us_bank_account", { billingEmail: "jo@example.com" }).label,
      ).toEqual({ text: "jo@example.com" });
      expect(typed("us_bank_account").label).toEqual({
        key: "paymentMethodsBankAccount",
      });
    });

    test("a debit of any kind is a bank account", () => {
      const row = typed("sepa_debit", { accountLast4: "3000" });
      expect(row.kind).toBe("bank");
      expect(row.label).toEqual({ key: "paymentMethodsBankAccount" });
      expect(row.last4).toBe("3000");
    });

    test.each([
      ["apple_pay", "paymentMethodsApplePayEndingIn"],
      ["google_pay", "paymentMethodsGooglePayEndingIn"],
    ])("%s wrapping a card ends in the card's digits", (type, key) => {
      expect(typed(type, { cardLast4: "1881" })).toMatchObject({
        kind: "wallet",
        label: { key },
        brand: type,
        last4: "1881",
      });
    });

    test.each([
      ["apple_pay", "Apple Pay"],
      ["google_pay", "Google Pay"],
    ])("%s with no card behind it is named %s", (type, name) => {
      expect(typed(type)).toMatchObject({
        label: { text: name },
        last4: null,
      });
    });

    test("Link is known by its email, then its account name", () => {
      expect(
        typed("link", { billingEmail: "jo@example.com", accountName: "Jo" })
          .label,
      ).toEqual({ text: "jo@example.com" });
      expect(typed("link", { accountName: "Jo" }).label).toEqual({
        text: "Jo",
      });
      expect(typed("link").label).toEqual({ text: "Link" });
    });

    test.each([
      ["paypal", "PayPal"],
      ["cashapp", "Cash App"],
    ])("%s is known by its account name, then its email", (type, name) => {
      expect(
        typed(type, { accountName: "Jo", billingEmail: "jo@example.com" })
          .label,
      ).toEqual({ text: "Jo" });
      expect(typed(type, { billingEmail: "jo@example.com" }).label).toEqual({
        text: "jo@example.com",
      });
      expect(typed(type).label).toEqual({ text: name });
    });

    test("Amazon Pay is known by its billing name, then its email", () => {
      expect(
        typed("amazon_pay", {
          billingName: "Jo Bloggs",
          billingEmail: "jo@example.com",
        }).label,
      ).toEqual({ text: "Jo Bloggs" });
      expect(
        typed("amazon_pay", { billingEmail: "jo@example.com" }).label,
      ).toEqual({ text: "jo@example.com" });
      expect(typed("amazon_pay").label).toEqual({ text: "Amazon Pay" });
    });

    test("a type nobody mapped has no digits", () => {
      expect(
        typed("wechat_pay", { cardLast4: "9999", accountLast4: "1111" }),
      ).toMatchObject({
        kind: "other",
        brand: "wechat_pay",
        last4: null,
        expiry: "none",
      });
    });

    test("a type nobody mapped is named by whatever the provider supplied", () => {
      expect(
        typed("wechat_pay", {
          billingName: "Jo",
          billingEmail: "jo@example.com",
          accountName: "jo",
          bankName: "Bank",
        }).label,
      ).toEqual({ text: "Jo" });
      expect(
        typed("wechat_pay", { billingEmail: "jo@example.com" }).label,
      ).toEqual({ text: "jo@example.com" });
      expect(typed("wechat_pay", { accountName: "jo" }).label).toEqual({
        text: "jo",
      });
      expect(typed("wechat_pay", { bankName: "Bank" }).label).toEqual({
        text: "Bank",
      });
      expect(typed("wechat_pay").label).toEqual({
        key: "paymentMethodsGeneric",
      });
    });
  });

  describe("expiry, judged from a fixed now", () => {
    test.each([
      // Whole months between August 2026 and the expiry month.
      [8, 2026, 0, "expired"],
      [7, 2026, -1, "expired"],
      [12, 2025, -8, "expired"],
      [9, 2026, 1, "soon"],
      [11, 2026, 3, "soon"],
      // Four months out is the first month that is not "soon".
      [12, 2026, 4, "ok"],
      [1, 2027, 5, "ok"],
      [8, 2027, 12, "ok"],
    ])("%d/%d is %d months away, %s", (month, year, months, expiry) => {
      const row = one({ cardExpMonth: month, cardExpYear: year });
      expect(row.monthsToExpiration).toBe(months);
      expect(row.expiry).toBe(expiry);
    });

    test("the day of the month never matters", () => {
      const lastMoment = new Date(2026, 7, 31, 23, 59, 59);
      const firstMoment = new Date(2026, 8, 1, 0, 0, 0);
      const months = (now: Date) =>
        derivePaymentMethods([method({ cardExpMonth: 9, cardExpYear: 2026 })], {
          locale: L,
          now,
        }).rows[0].monthsToExpiration;
      expect(months(lastMoment)).toBe(1);
      expect(months(firstMoment)).toBe(0);
    });

    test("the short form is the month as written and the year's last two digits", () => {
      expect(one({ cardExpMonth: 8, cardExpYear: 2027 }).expiresShort).toBe(
        "8/27",
      );
      expect(one({ cardExpMonth: 12, cardExpYear: 2030 }).expiresShort).toBe(
        "12/30",
      );
    });

    test("a card with no expiry has none, and no text for it", () => {
      const row = one({ cardExpMonth: null, cardExpYear: null });
      expect(row.expiry).toBe("none");
      expect(row.expiresShort).toBeNull();
      expect(row.monthsToExpiration).toBeNull();
      expect(one({ cardExpMonth: 8, cardExpYear: undefined }).expiry).toBe(
        "none",
      );
      expect(one({ cardExpMonth: 13, cardExpYear: 2027 }).expiry).toBe("none");
      expect(
        one({ cardExpMonth: 0, cardExpYear: 2027 }).expiresShort,
      ).toBeNull();
    });

    test("defaults now to the clock", () => {
      expect(
        derivePaymentMethods([method({ cardExpYear: 2099 })], { locale: L })
          .rows[0].expiry,
      ).toBe("ok");
    });
  });

  describe("the default and the others", () => {
    const set = () => [
      method({ id: "a", externalId: "a_ext" }),
      method({ id: "b", externalId: "b_ext", isDefault: true }),
      method({ id: "c", externalId: "c_ext" }),
    ];

    test("the default is current; the rest are the others, in the order given", () => {
      const derived = derivePaymentMethods(set(), { locale: L, now: NOW });
      expect(derived.rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
      expect(derived.current?.id).toBe("b");
      expect(derived.others.map((row) => row.id)).toEqual(["a", "c"]);
    });

    test("with no default, nothing is current and every row is an other", () => {
      const derived = derivePaymentMethods(
        set().map((row) => ({ ...row, isDefault: false })),
        { locale: L, now: NOW },
      );
      expect(derived.current).toBeNull();
      expect(derived.others.map((row) => row.id)).toEqual(["a", "b", "c"]);
      expect(derived.monthsToExpiration).toBeNull();
      expect(derived.expiryWarning).toBe("none");
    });

    test("the header's warning is the default card's, and only its", () => {
      const soon = derivePaymentMethods(
        [
          method({ id: "a", cardExpMonth: 1, cardExpYear: 2020 }),
          method({
            id: "b",
            isDefault: true,
            cardExpMonth: 10,
            cardExpYear: 2026,
          }),
        ],
        { locale: L, now: NOW },
      );
      expect(soon.monthsToExpiration).toBe(2);
      expect(soon.expiryWarning).toBe("soon");

      const expired = derivePaymentMethods(
        [method({ isDefault: true, cardExpMonth: 8, cardExpYear: 2026 })],
        { locale: L, now: NOW },
      );
      expect(expired.monthsToExpiration).toBe(0);
      expect(expired.expiryWarning).toBe("expired");

      const fine = derivePaymentMethods([method({ isDefault: true })], {
        locale: L,
        now: NOW,
      });
      expect(fine.monthsToExpiration).toBe(12);
      expect(fine.expiryWarning).toBe("none");

      const bank = derivePaymentMethods(
        [method({ type: "us_bank_account", isDefault: true })],
        { locale: L, now: NOW },
      );
      expect(bank.expiryWarning).toBe("none");
    });
  });

  test("an empty list derives to nothing at all", () => {
    expect(derivePaymentMethods([], { locale: L, now: NOW })).toEqual({
      rows: [],
      current: null,
      others: [],
      monthsToExpiration: null,
      expiryWarning: "none",
    });
  });
});
