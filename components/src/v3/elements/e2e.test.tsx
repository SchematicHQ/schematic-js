import { SchematicCompanyClient, companyApi } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { SCENARIOS } from "../fixtures/scenarios";

import { Invoices } from "./Invoices";
import { UpcomingBill } from "./UpcomingBill";

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
    if (url.pathname === "/company/upcoming-invoice") {
      const upcoming = scenario.upcomingInvoice;
      // The endpoint reports "nothing to bill" as a 404, which the client
      // reads as `null` — the arm that keeps an empty state from looking
      // like a failure.
      return upcoming == null
        ? new Response(JSON.stringify({ error: "not found" }), { status: 404 })
        : new Response(
            JSON.stringify({
              data: companyApi.CompanyUpcomingInvoiceResponseDataToJSON(
                upcoming,
              ),
              params: {},
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

function renderStack(
  ui: React.ReactNode,
  accessToken?: string,
  scenario = SCENARIOS.pro(),
) {
  const client = new SchematicCompanyClient({
    accessToken,
    apiUrl: "https://api.test",
    fetch: serve(scenario),
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

  test("UpcomingBill", async () => {
    renderStack(<UpcomingBill locale="en-US" />, "tok");
    expect(
      await screen.findByTestId("schematic-upcoming-total"),
    ).toHaveTextContent("$68.00");
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off for 3 months",
    );
  });

  test("UpcomingBill renders the empty state for a 404", async () => {
    renderStack(<UpcomingBill locale="en-US" />, "tok", SCENARIOS.unbilled());
    expect(await screen.findByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
