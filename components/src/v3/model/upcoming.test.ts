import { discount, upcomingInvoice } from "../fixtures/builders";

import { deriveUpcomingInvoice } from "./upcoming";

const L = "en-US";
const derive = (
  overrides: Parameters<typeof upcomingInvoice>[0] = {},
  locale = L,
) => deriveUpcomingInvoice(upcomingInvoice(overrides), { locale });

describe("deriveUpcomingInvoice", () => {
  test("formats the amounts and the due date", () => {
    const bill = derive({ amountDue: 6800, subtotal: 8300 });
    expect(bill.amountDueText).toBe("$68.00");
    expect(bill.subtotalText).toBe("$83.00");
    expect(bill.currency).toBe("USD");
    expect(bill.dueAt?.text).toMatch(/^\w+ \d+, \d{4}$/);
  });

  test("carries the raw values beside the text", () => {
    const bill = derive({ amountDue: 6800, subtotal: 8300 });
    expect(bill.amountDueMinor).toBe(6800);
    expect(bill.subtotalMinor).toBe(8300);
    expect(bill.dueAt?.date).toBeInstanceOf(Date);
  });

  test("has no due date when the provider names none", () => {
    expect(derive({ dueDate: null }).dueAt).toBeNull();
  });

  test("renders the applied balance as a deduction", () => {
    // The server reports what was applied as a positive amount; the bill
    // shows it coming off, so the sign is the derivation's job.
    const bill = derive({
      customerBalanceApplied: 1500,
      customerBalanceRemaining: 3200,
    });
    expect(bill.balanceApplied).toEqual({
      amountMinor: -1500,
      amountText: "-$15.00",
    });
    expect(bill.balanceRemaining).toEqual({
      amountMinor: 3200,
      amountText: "$32.00",
    });
  });

  test("says nothing about a balance the company does not have", () => {
    const bill = derive();
    expect(bill.balanceApplied).toBeNull();
    expect(bill.balanceRemaining).toBeNull();
  });

  test("reports a balance spent to zero rather than dropping the row", () => {
    // "You had credit and it is now gone" is worth saying; "you never had
    // any" is not.
    const bill = derive({
      customerBalanceApplied: 1500,
      customerBalanceRemaining: 0,
    });
    expect(bill.balanceApplied?.amountText).toBe("-$15.00");
    expect(bill.balanceRemaining).toEqual({
      amountMinor: 0,
      amountText: "$0.00",
    });
  });

  test("describes a percentage discount", () => {
    const [line] = derive({ discounts: [discount()] }).discounts;
    expect(line).toMatchObject({
      code: "LAUNCH20",
      couponName: "Launch",
      kind: "percent",
      months: 3,
      percentOff: 20,
      amountOffMinor: null,
      valueText: "20%",
    });
  });

  test("describes a fixed-amount discount in its own currency", () => {
    const [line] = derive({
      discounts: [
        discount({
          amountOff: 500,
          currency: "eur",
          customerFacingCode: null,
          duration: "once",
          durationInMonths: null,
          percentOff: null,
        }),
      ],
    }).discounts;
    expect(line).toMatchObject({
      amountOffMinor: 500,
      code: null,
      kind: "amount",
      months: null,
      valueText: "€5.00",
    });
  });

  test("only counts months for a discount that repeats", () => {
    // Stripe sends duration_in_months alongside a `forever` coupon; it is
    // not a countdown, so the bill must not print one.
    const [line] = derive({
      discounts: [discount({ duration: "forever", durationInMonths: 12 })],
    }).discounts;
    expect(line.months).toBeNull();
    expect(line.duration).toBe("forever");
  });

  test("drops a discount that takes nothing off", () => {
    // The server filters these out, so this is about the wire types: both
    // amounts are optional, and neither being set is not a row.
    const bill = derive({
      discounts: [
        discount({ amountOff: 0, percentOff: 0 }),
        discount({ amountOff: null, percentOff: null }),
      ],
    });
    expect(bill.discounts).toHaveLength(0);
  });

  test("formats for the locale it is given", () => {
    const bill = derive({ amountDue: 123456, currency: "eur" }, "de-DE");
    // Non-breaking spaces and a comma decimal: the locale's, not ours.
    expect(bill.amountDueText).toContain("1.234,56");
    expect(bill.amountDueText).toContain("€");
  });

  test("lets a host format the parts itself", () => {
    const bill = deriveUpcomingInvoice(
      upcomingInvoice({ amountDue: 6800, customerBalanceApplied: 1500 }),
      {
        locale: L,
        format: {
          amount: (amountMinor, currency) => `${currency} ${amountMinor}`,
          date: () => "soon",
        },
      },
    );
    expect(bill.amountDueText).toBe("USD 6800");
    // The override sees the signed amount, so it decides how a deduction reads.
    expect(bill.balanceApplied?.amountText).toBe("USD -1500");
    expect(bill.dueAt?.text).toBe("soon");
  });
});
