import { billingApi } from "@schematichq/schematic-js";

import { SCENARIOS, type ScenarioName } from "./scenarios";

/**
 * Every fixture survives a round trip through the generated wire models, so
 * the fixtures are proven against the API's declared shapes and double as
 * wire examples.
 */
describe("wire round trip", () => {
  test.each(Object.keys(SCENARIOS) as ScenarioName[])("%s", (name) => {
    const rows = SCENARIOS[name]().invoices?.invoices ?? [];
    const wire = rows.map((row) =>
      billingApi.CompanyInvoiceResponseDataToJSON(row),
    );
    expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/); // no camelCase on the wire
    const decoded = JSON.parse(JSON.stringify(wire)).map(
      billingApi.CompanyInvoiceResponseDataFromJSON,
    );
    expect(decoded).toEqual(rows);
  });

  test.each(Object.keys(SCENARIOS) as ScenarioName[])(
    "%s, the next bill",
    (name) => {
      const bill = SCENARIOS[name]().upcomingInvoice;
      if (bill == null) {
        return; // nothing to bill is a 204, not a body
      }
      const wire = billingApi.CompanyUpcomingInvoiceResponseDataToJSON(bill);
      expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/);
      const decoded = billingApi.CompanyUpcomingInvoiceResponseDataFromJSON(
        JSON.parse(JSON.stringify(wire)),
      );
      expect(decoded).toEqual(bill);
    },
  );

  test.each(Object.keys(SCENARIOS) as ScenarioName[])(
    "%s, the payment methods",
    (name) => {
      const methods = SCENARIOS[name]().paymentMethods ?? [];
      const wire = methods.map((method) =>
        billingApi.CompanyPaymentMethodResponseDataToJSON(method),
      );
      expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/);
      const decoded = JSON.parse(JSON.stringify(wire)).map(
        billingApi.CompanyPaymentMethodResponseDataFromJSON,
      );
      expect(decoded).toEqual(methods);
    },
  );

  test("a payment method's fields are snake_case on the wire", () => {
    const [card] = SCENARIOS.paymentMethods().paymentMethods ?? [];
    const wire = billingApi.CompanyPaymentMethodResponseDataToJSON(card);
    expect(wire).toMatchObject({
      external_id: "pm_card_ext",
      is_default: true,
      can_remove: false,
      card_brand: "visa",
      card_last4: "4242",
      card_exp_month: 8,
      card_exp_year: 2027,
    });
  });
});
