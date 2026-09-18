import type { PaymentMethod } from "@schematichq/schematic-react";

import { formatMonthYear } from "./format";
import { derivePaymentMethods } from "./paymentMethods";

const L = "en-US";
/** 21 August 2026: expiry is judged against this month. */
const NOW = new Date("2026-08-21T12:00:00.000Z");

function method(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: "pm_1",
    externalId: "pm_ext_1",
    type: "card",
    isDefault: false,
    canRemove: true,
    cardBrand: "visa",
    cardLast4: "4242",
    cardExpMonth: 8,
    cardExpYear: 2027,
    ...overrides,
  };
}

function one(overrides: Partial<PaymentMethod> = {}) {
  return derivePaymentMethods([method(overrides)], { locale: L, now: NOW })[0];
}

describe("derivePaymentMethods", () => {
  test("a card: brand, last four, expiry, and the raw fields beside them", () => {
    expect(one({ id: "pm_9", externalId: "pm_x", isDefault: true })).toEqual({
      id: "pm_9",
      externalId: "pm_x",
      kind: "card",
      type: "card",
      label: "Visa",
      brandText: "Visa",
      brand: "visa",
      last4: "4242",
      expiresText: "08/2027",
      expiry: "ok",
      isDefault: true,
      canRemove: true,
    });
  });

  test.each([
    ["visa", "Visa"],
    ["mastercard", "Mastercard"],
    ["amex", "American Express"],
    ["discover", "Discover"],
    ["MasterCard", "Mastercard"],
  ])("names the %s brand %s", (brand, text) => {
    expect(one({ cardBrand: brand }).brandText).toBe(text);
  });

  test("capitalizes a brand it has no name for, and says Card for none", () => {
    expect(one({ cardBrand: "cartes_bancaires" }).brandText).toBe(
      "Cartes Bancaires",
    );
    expect(one({ cardBrand: null }).brandText).toBe("Card");
    expect(one({ cardBrand: undefined }).label).toBe("Card");
    expect(one({ cardBrand: "" }).brand).toBe("card");
  });

  test("a card with no digits shows the brand alone", () => {
    expect(one({ cardLast4: null }).last4).toBeNull();
    expect(one({ cardLast4: "" }).last4).toBeNull();
  });

  test("a bank account: the bank's name and the account's digits", () => {
    const row = one({
      type: "us_bank_account",
      cardBrand: undefined,
      cardLast4: undefined,
      cardExpMonth: undefined,
      cardExpYear: undefined,
      bankName: "Chase",
      accountLast4: "6789",
    });
    expect(row).toMatchObject({
      kind: "bank",
      label: "Chase",
      brandText: "Chase",
      brand: "us_bank_account",
      last4: "6789",
      expiresText: "",
      expiry: "none",
    });
  });

  test("a debit of any kind is a bank account, named as such without a bank", () => {
    const row = one({
      type: "sepa_debit",
      cardBrand: null,
      cardLast4: null,
      cardExpMonth: null,
      cardExpYear: null,
      accountLast4: "3000",
    });
    expect(row.kind).toBe("bank");
    expect(row.label).toBe("Bank account");
    expect(row.last4).toBe("3000");
  });

  test.each([
    ["apple_pay", "Apple Pay"],
    ["google_pay", "Google Pay"],
    ["link", "Link"],
    ["paypal", "PayPal"],
    ["cashapp", "Cash App"],
    ["amazon_pay", "Amazon Pay"],
  ])("a %s wallet is named %s", (type, name) => {
    const row = one({
      type,
      cardBrand: null,
      cardLast4: null,
      cardExpMonth: null,
      cardExpYear: null,
    });
    expect(row.kind).toBe("wallet");
    expect(row.brandText).toBe(name);
    expect(row.label).toBe(name);
    expect(row.brand).toBe(type);
    expect(row.last4).toBeNull();
  });

  test("a wallet names the account behind it, the email failing that", () => {
    const base = {
      type: "link",
      cardBrand: null,
      cardLast4: null,
      cardExpMonth: null,
      cardExpYear: null,
    };
    expect(one({ ...base, accountName: "jo@example.com" }).label).toBe(
      "Link · jo@example.com",
    );
    expect(one({ ...base, billingEmail: "jo@example.com" }).label).toBe(
      "Link · jo@example.com",
    );
    expect(
      one({ ...base, accountName: "Jo", billingEmail: "jo@example.com" }).label,
    ).toBe("Link · Jo");
  });

  test("Apple Pay and Google Pay carry the digits of the card they wrap", () => {
    expect(
      one({
        type: "apple_pay",
        cardBrand: null,
        cardLast4: "1881",
        cardExpMonth: null,
        cardExpYear: null,
      }),
    ).toMatchObject({ kind: "wallet", label: "Apple Pay", last4: "1881" });
  });

  test("a type nobody mapped is turned into words, with no digits", () => {
    const row = one({
      type: "wechat_pay",
      cardBrand: null,
      cardLast4: "9999",
      cardExpMonth: null,
      cardExpYear: null,
      accountLast4: "1111",
    });
    expect(row).toMatchObject({
      kind: "other",
      label: "Wechat Pay",
      brandText: "Wechat Pay",
      brand: "wechat_pay",
      last4: null,
      expiry: "none",
    });
  });

  describe("expiry, judged from a fixed now", () => {
    test.each([
      // The card is good through the last day of its month.
      [8, 2026, "soon"],
      [7, 2026, "expired"],
      [12, 2025, "expired"],
      [9, 2026, "soon"],
      [11, 2026, "soon"],
      // Four months out is the first month that is not "soon".
      [12, 2026, "ok"],
      [1, 2027, "ok"],
      [8, 2027, "ok"],
    ])("%d/%d is %s", (month, year, expiry) => {
      expect(one({ cardExpMonth: month, cardExpYear: year }).expiry).toBe(
        expiry,
      );
    });

    test("the day of the month never matters", () => {
      const lastMoment = new Date("2026-08-31T23:59:59.000Z");
      const firstMoment = new Date("2026-09-01T00:00:00.000Z");
      const rows = (now: Date) =>
        derivePaymentMethods([method({ cardExpMonth: 8, cardExpYear: 2026 })], {
          locale: L,
          now,
        })[0].expiry;
      expect(rows(lastMoment)).toBe("soon");
      expect(rows(firstMoment)).toBe("expired");
    });

    test("a card with no expiry has none, and no text for it", () => {
      const row = one({ cardExpMonth: null, cardExpYear: null });
      expect(row.expiry).toBe("none");
      expect(row.expiresText).toBe("");
      expect(one({ cardExpMonth: 8, cardExpYear: undefined }).expiry).toBe(
        "none",
      );
    });

    test("the text follows the locale", () => {
      // Japanese writes the year first.
      const rows = derivePaymentMethods([method()], {
        locale: "ja-JP",
        now: NOW,
      });
      expect(rows[0].expiresText).toBe(formatMonthYear(8, 2027, "ja-JP"));
      expect(rows[0].expiresText).toBe("2027/08");
    });

    test("defaults now to the clock", () => {
      const farFuture = one({ cardExpYear: NOW.getUTCFullYear() + 10 });
      expect(
        derivePaymentMethods([method({ cardExpYear: 2099 })], { locale: L })[0]
          .expiry,
      ).toBe("ok");
      expect(farFuture.expiry).toBe("ok");
    });
  });

  test("keeps the order the server gave", () => {
    const rows = derivePaymentMethods(
      [method({ id: "b" }), method({ id: "a" })],
      { locale: L, now: NOW },
    );
    expect(rows.map((row) => row.id)).toEqual(["b", "a"]);
  });

  test("an empty list derives to an empty list", () => {
    expect(derivePaymentMethods([], { locale: L, now: NOW })).toEqual([]);
  });
});

describe("formatMonthYear", () => {
  test("zero-pads the month", () => {
    expect(formatMonthYear(8, 2027, L)).toBe("08/2027");
    expect(formatMonthYear(12, 2027, L)).toBe("12/2027");
  });

  test("is empty for a month or year that is not one", () => {
    expect(formatMonthYear(0, 2027, L)).toBe("");
    expect(formatMonthYear(13, 2027, L)).toBe("");
    expect(formatMonthYear(8, 2027.5, L)).toBe("");
    expect(formatMonthYear(Number.NaN, 2027, L)).toBe("");
  });

  test("survives a locale Intl rejects", () => {
    expect(formatMonthYear(8, 2027, "en_US")).toBe("08/2027");
  });
});
