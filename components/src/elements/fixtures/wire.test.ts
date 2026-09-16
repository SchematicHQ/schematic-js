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
});
