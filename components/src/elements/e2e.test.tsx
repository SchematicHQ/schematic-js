import { SchematicCompanyClient, companyApi } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices } from "./Invoices";
import { invoice } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

/**
 * The whole stack: wire JSON → schematic-js client → schematic-react store
 * and hooks → derivations → DOM, with fetch faked at the network edge.
 */
/**
 * Answers /company/invoices the way the API does: the window `limit` and
 * `offset` ask for, and the count of the whole history beside it.
 */
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
        .map((row) => companyApi.CompanyInvoiceResponseDataToJSON(row));
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

  test("Invoices pages the history and stops at the end of it", async () => {
    // A history longer than one page, served through the real client: the
    // count is what says there is more, and the rows that arrive are what
    // says there is not.
    const history = Array.from({ length: 30 }, (_, i) =>
      invoice({ id: `inv_${i}`, amountDue: 100 * (i + 1) }),
    );
    // The whole history is what the server holds; the client asks for it a
    // page at a time.
    renderStack(<Invoices limit={30} />, "tok", {
      invoices: { invoices: history, count: history.length, hasMore: true },
    });

    expect(await screen.findAllByTestId("schematic-invoice")).toHaveLength(12);
    expect(screen.getByText("12 of 30 invoices")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(24),
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(30),
    );
    // Everything is loaded, so the control goes and the count reads plainly.
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(screen.getByText("30 invoices")).toBeInTheDocument();
  });

  test("Invoices reports the missing token rather than crashing", async () => {
    renderStack(<Invoices />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/access token/);
  });
});
