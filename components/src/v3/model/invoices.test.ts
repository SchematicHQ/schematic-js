import {
  daysFromNow,
  discount,
  invoice,
  invoicePage,
  subscription,
  upcomingInvoice,
} from "../fixtures/builders";

import { formatDate } from "./format";
import {
  deriveContractEnd,
  deriveInvoiceList,
  deriveUpcomingInvoice,
} from "./invoices";

const L = "en-US";

describe("deriveInvoiceList", () => {
  test("formats each row and passes hasMore through", () => {
    const list = deriveInvoiceList(
      invoicePage(
        [
          invoice({
            id: "inv_a",
            amountDue: 6800,
            dueDate: daysFromNow(-10),
            url: "https://invoice.example/a",
          }),
        ],
        true,
      ),
      { locale: L },
    );
    expect(list.hasMore).toBe(true);
    expect(list.rows[0]).toMatchObject({
      id: "inv_a",
      dateText: formatDate(daysFromNow(-10), L),
      amountText: "$68.00",
      isCredit: false,
      status: "paid",
      url: "https://invoice.example/a",
    });
  });

  test.each([
    ["a charge", 1500, "$15.00", false],
    ["a credit note", -1500, "$15.00", true],
    ["a fractional charge", 1999.6, "$20.00", false],
  ])("%s", (_label, amountDue, amountText, isCredit) => {
    const list = deriveInvoiceList(invoicePage([invoice({ amountDue })]), {
      locale: L,
    });
    expect(list.rows[0]).toMatchObject({ amountText, isCredit });
  });

  test.each([
    ["the due date when set", daysFromNow(-10), daysFromNow(-11), -10],
    ["the created date otherwise", null, daysFromNow(-11), -11],
  ])("dates the row by %s", (_label, dueDate, createdAt, expectedDays) => {
    const list = deriveInvoiceList(
      invoicePage([invoice({ dueDate, createdAt })]),
      { locale: L },
    );
    expect(list.rows[0].date).toEqual(daysFromNow(expectedDays));
    expect(list.rows[0].dateText).toBe(
      formatDate(daysFromNow(expectedDays), L),
    );
  });
});

describe("deriveUpcomingInvoice", () => {
  test("formats the amounts and due date", () => {
    const summary = deriveUpcomingInvoice(
      upcomingInvoice({
        amountDue: 6120,
        subtotal: 6800,
        dueDate: daysFromNow(20),
      }),
      subscription(),
      { locale: L },
    );
    expect(summary).toMatchObject({
      amountDue: 6120,
      amountDueText: "$61.20",
      subtotalText: "$68.00",
      currency: "usd",
      dueAt: { text: formatDate(daysFromNow(20), L) },
    });
  });

  test("has no due date when the provider gives none", () => {
    const summary = deriveUpcomingInvoice(
      upcomingInvoice({ dueDate: null }),
      null,
      { locale: L },
    );
    expect(summary.dueAt).toBeNull();
  });

  test.each([
    ["a percent", { percentOff: 20, amountOff: null }, "20%"],
    ["an amount", { percentOff: null, amountOff: 500 }, "$5.00"],
    [
      "an amount in its own currency",
      { percentOff: null, amountOff: 500, currency: "eur" },
      "€5.00",
    ],
    ["a percent over an amount", { percentOff: 10, amountOff: 500 }, "10%"],
  ])("values %s discount", (_label, overrides, valueText) => {
    const summary = deriveUpcomingInvoice(
      upcomingInvoice({ discounts: [discount(overrides)] }),
      null,
      { locale: L },
    );
    expect(summary.discounts).toHaveLength(1);
    expect(summary.discounts[0].valueText).toBe(valueText);
  });

  test.each([
    ["neither value", { percentOff: null, amountOff: null }],
    ["a zero percent", { percentOff: 0, amountOff: null }],
    ["a zero amount", { percentOff: null, amountOff: 0 }],
    ["negative values", { percentOff: -5, amountOff: -100 }],
  ])("drops a discount with %s", (_label, overrides) => {
    const summary = deriveUpcomingInvoice(
      upcomingInvoice({ discounts: [discount(overrides)] }),
      null,
      { locale: L },
    );
    expect(summary.discounts).toEqual([]);
  });

  test.each([
    ["repeating", 3, 3],
    ["forever", 3, null],
    ["once", null, null],
  ] as const)(
    "months for a %s discount",
    (duration, durationInMonths, months) => {
      const summary = deriveUpcomingInvoice(
        upcomingInvoice({
          discounts: [discount({ duration, durationInMonths })],
        }),
        null,
        { locale: L },
      );
      expect(summary.discounts[0]).toMatchObject({
        couponName: "Launch",
        code: "LAUNCH20",
        duration,
        months,
      });
    },
  );

  test.each([
    ["no balance", 0, 0, null, null],
    ["a balance fully applied", 500, 0, "$5.00", "$0.00"],
    ["a balance partly applied", 500, 200, "$5.00", "$2.00"],
    ["a balance left without an application", 0, 300, null, "$3.00"],
  ])("%s", (_label, applied, remaining, appliedText, remainingText) => {
    const summary = deriveUpcomingInvoice(
      upcomingInvoice({
        customerBalanceApplied: applied,
        customerBalanceRemaining: remaining,
      }),
      null,
      { locale: L },
    );
    expect(summary.balanceApplied?.text ?? null).toBe(appliedText);
    expect(summary.balanceRemaining?.text ?? null).toBe(remainingText);
  });

  test.each([
    ["no subscription", null, null],
    ["an open-ended subscription", subscription({ cancelAt: null }), null],
    [
      "a subscription scheduled to end",
      subscription({ cancelAt: daysFromNow(20) }),
      formatDate(daysFromNow(20), L),
    ],
  ])("contract end with %s", (_label, sub, text) => {
    const summary = deriveUpcomingInvoice(upcomingInvoice(), sub, {
      locale: L,
    });
    expect(summary.contractEndsAt?.text ?? null).toBe(text);
    expect(deriveContractEnd(sub, { locale: L })?.text ?? null).toBe(text);
  });

  test.each([
    ["month", 1, "month", "month"],
    ["month", 3, "quarter", "quarter"],
    ["month", 12, "year", "year"],
    ["year", 1, "year", "year"],
    ["week", 1, null, null],
    ["month", 6, null, null],
  ])(
    "period word from interval %s × %i",
    (interval, intervalCount, period, periodWord) => {
      const summary = deriveUpcomingInvoice(
        upcomingInvoice(),
        subscription({ interval, intervalCount }),
        { locale: L },
      );
      expect(summary.period).toBe(period);
      expect(summary.periodWord).toBe(periodWord);
    },
  );

  test("has no period without a subscription", () => {
    const summary = deriveUpcomingInvoice(upcomingInvoice(), null, {
      locale: L,
    });
    expect(summary.period).toBeNull();
    expect(summary.periodWord).toBeNull();
  });
});
