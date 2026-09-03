import { companyApi } from "@schematichq/schematic-js";

import { SCENARIOS, type ScenarioName } from "./scenarios";

/**
 * Every fixture invoice survives a trip through the generated wire models
 * and back, so the TS fixtures double as wire examples and the fixtures are
 * proven against the shapes the API's spec declares.
 */
describe("wire round trip", () => {
  test.each(Object.keys(SCENARIOS) as ScenarioName[])("%s invoices", (name) => {
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

  test.each(Object.keys(SCENARIOS) as ScenarioName[])(
    "%s upcoming invoice",
    (name) => {
      const upcoming = SCENARIOS[name]().upcomingInvoice;
      if (upcoming == null) {
        // A company with nothing to bill has no wire shape to prove: the
        // endpoint answers 404 and the client makes it `null`.
        expect(upcoming).toBeNull();
        return;
      }
      const wire =
        companyApi.CompanyUpcomingInvoiceResponseDataToJSON(upcoming);
      expect(JSON.stringify(wire)).not.toMatch(/"[a-z]+[A-Z]/);
      const decoded = companyApi.CompanyUpcomingInvoiceResponseDataFromJSON(
        JSON.parse(JSON.stringify(wire)),
      );
      expect(decoded).toEqual(upcoming);
    },
  );
});
