import { daysFromNow, invoice, invoicePage } from "../fixtures/builders";

import { formatDate } from "./format";
import { deriveInvoiceList } from "./invoices";

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

  test("passes an absent status through as null", () => {
    const list = deriveInvoiceList(invoicePage([invoice({ status: null })]), {
      locale: L,
    });
    expect(list.rows[0]).toMatchObject({ status: null });
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

  // A host rendering its own markup gets the value beside the text, so it
  // never has to abandon the derivation to format differently.
  test("carries the raw amount and currency beside the formatted text", () => {
    const list = deriveInvoiceList(
      invoicePage([invoice({ amountDue: -1500, currency: "eur" })]),
      { locale: L },
    );
    expect(list.rows[0]).toMatchObject({
      amountMinor: -1500,
      currency: "EUR",
      isCredit: true,
    });
  });

  test("takes per-field formatters, which receive the signed amount", () => {
    const list = deriveInvoiceList(
      invoicePage([
        invoice({
          amountDue: -1500,
          currency: "usd",
          dueDate: daysFromNow(-10),
        }),
      ]),
      {
        locale: L,
        format: {
          date: (date, locale) =>
            new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(
              date,
            ),
          // Accounting negatives, which the default text leaves to isCredit.
          amount: (amountMinor, currency) =>
            `${amountMinor < 0 ? "-" : ""}${Math.abs(amountMinor) / 100} ${currency}`,
        },
      },
    );
    expect(list.rows[0].amountText).toBe("-15 USD");
    expect(list.rows[0].dateText).toBe(
      new Intl.DateTimeFormat(L, { dateStyle: "short" }).format(
        daysFromNow(-10),
      ),
    );
  });
});
