import { SchematicCompanyClient, companyApi } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { SCENARIOS } from "../fixtures/scenarios";

import { Invoices } from "./Invoices";

/**
 * The whole stack: wire JSON → schematic-js client → schematic-react store
 * and hooks → derivations → DOM, with fetch faked at the network edge.
 */
function serve(scenario: ReturnType<(typeof SCENARIOS)["pro"]>) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/company/invoices") {
      const rows = (scenario.invoices?.invoices ?? []).map((row) =>
        companyApi.CompanyInvoiceResponseDataToJSON(row),
      );
      return new Response(
        JSON.stringify({
          data: rows,
          params: { limit: Number(url.searchParams.get("limit")) },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
    });
  });
  return fetchImpl as unknown as typeof fetch;
}

function renderStack(ui: React.ReactNode, accessToken?: string) {
  const client = new SchematicCompanyClient({
    accessToken,
    apiUrl: "https://api.test",
    fetch: serve(SCENARIOS.pro()),
  });
  return render(
    <SchematicProvider publishableKey="pk_test" companyClient={client}>
      {ui}
    </SchematicProvider>,
  );
}

describe("end to end", () => {
  test("Invoices", async () => {
    renderStack(<Invoices limit={2} />, "tok");
    const rows = await screen.findAllByTestId("schematic-invoice");
    expect(rows).toHaveLength(2); // collapsed to the limit
    expect(rows[0]).toHaveTextContent("$68.00");
  });

  test("Invoices reports the missing token rather than crashing", async () => {
    renderStack(<Invoices />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/access token/);
  });
});
