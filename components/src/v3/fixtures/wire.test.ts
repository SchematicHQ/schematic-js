import { companyApi } from "@schematichq/schematic-js";

import { SCENARIOS, type ScenarioName } from "./scenarios";

/**
 * Every fixture invoice survives a trip through the generated wire models
 * and back, so the TS fixtures double as wire examples and the fixtures are
 * proven against the shapes the API's spec declares.
 */
describe("wire round trip", () => {
  test.each(Object.keys(SCENARIOS) as ScenarioName[])("%s", (name) => {
    const rows = SCENARIOS[name]().invoices?.invoices ?? [];
    const wire = rows.map((row) =>
      companyApi.CompanyInvoiceResponseDataToJSON(row),
    );
    expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/); // no camelCase on the wire
    const decoded = JSON.parse(JSON.stringify(wire)).map(
      companyApi.CompanyInvoiceResponseDataFromJSON,
    );
    expect(decoded).toEqual(rows);
  });
});
