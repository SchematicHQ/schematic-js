import { SchematicBillingClient, billingApi } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices } from "./Invoices";
import { invoice } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

/**
 * Exercises the whole stack, wire JSON through the schematic-js client and
 * schematic-react hooks to the DOM, with fetch faked at the network edge.
 */

/** Answers /company/invoices the way the API does: a `limit`/`offset` window
 * plus the total count. */
function serve(scenario: ReturnType<(typeof SCENARIOS)["pro"]>) {
  const all = scenario.invoices?.invoices ?? [];
  const count = scenario.invoices?.count ?? all.length;
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/company/invoices") {
      const limit = Number(url.searchParams.get("limit"));
      const offset = Number(url.searchParams.get("offset"));
      const rows = all
        .slice(offset, offset + limit)
        .map((row) => billingApi.CompanyInvoiceResponseDataToJSON(row));
      return new Response(
        JSON.stringify({
          data: { count, invoices: rows },
          params: { limit, offset },
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
  token?: string,
  scenario = SCENARIOS.pro(),
) {
  const client = new SchematicBillingClient({
    session: token === undefined ? undefined : { company: "co_test", token },
    apiUrl: "https://api.test",
    fetch: serve(scenario),
  });
  return render(
    <SchematicProvider publishableKey="pk_test" billingClient={client}>
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

  test("Invoices pages the history and stops at the end of it", async () => {
    // Paging stops once the rows loaded reach `count`.
    const history = Array.from({ length: 30 }, (_, i) =>
      invoice({ id: `inv_${i}`, amountDue: 100 * (i + 1) }),
    );
    renderStack(<Invoices limit={30} />, "tok", {
      invoices: { invoices: history, count: history.length, hasMore: true },
    });

    expect(await screen.findAllByTestId("schematic-invoice")).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(24),
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(30),
    );
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
  });

  test("Invoices waits rather than failing while the session is pending", async () => {
    // A host renders without a session until its auth resolves; that is
    // loading, not an error.
    renderStack(<Invoices />);
    expect(await screen.findByText("Loading invoices")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
