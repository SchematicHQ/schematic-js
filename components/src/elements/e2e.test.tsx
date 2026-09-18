import {
  SchematicBillingClient,
  billingApi,
  fetchBillingData,
} from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices } from "./Invoices";
import { PaymentMethods } from "./PaymentMethods";
import { UpcomingBill } from "./UpcomingBill";
import { billingResources } from "./common";
import { invoice } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

/**
 * Exercises the whole stack, wire JSON through the schematic-js client and
 * schematic-react hooks to the DOM, with fetch faked at the network edge.
 */

/**
 * Answers /company/invoices the way the API does — a `limit`/`offset` window
 * plus the total count — /company/upcoming-invoice with the bill, or a 204
 * when there is nothing to bill, and /company/payment-methods with the list,
 * empty or not, always a 200. An account not on the flag gets a 404 from
 * every company route, which is what everything else falls to.
 */
function serve(
  scenario: ReturnType<(typeof SCENARIOS)["pro"]>,
  flagged = true,
) {
  const all = scenario.invoices?.invoices ?? [];
  const count = scenario.invoices?.count ?? all.length;
  const upcoming = scenario.upcomingInvoice;
  const methods = scenario.paymentMethods ?? [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (flagged && url.pathname === "/company/payment-methods") {
      return new Response(
        JSON.stringify({
          data: {
            count: methods.length,
            payment_methods: methods.map((method) =>
              billingApi.CompanyPaymentMethodResponseDataToJSON(method),
            ),
          },
          params: {},
        }),
        { status: 200 },
      );
    }
    if (flagged && url.pathname === "/company/upcoming-invoice") {
      return upcoming == null
        ? new Response(null, { status: 204 })
        : new Response(
            JSON.stringify({
              data: billingApi.CompanyUpcomingInvoiceResponseDataToJSON(
                upcoming,
              ),
              params: {},
            }),
            { status: 200 },
          );
    }
    if (flagged && url.pathname === "/company/invoices") {
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
  flagged = true,
) {
  const client = new SchematicBillingClient({
    session: token === undefined ? undefined : { company: "co_test", token },
    apiUrl: "https://api.test",
    fetch: serve(scenario, flagged),
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

  test("UpcomingBill", async () => {
    renderStack(<UpcomingBill />, "tok");
    expect(
      await screen.findByTestId("schematic-upcoming-total"),
    ).toHaveTextContent("$68.00");
    expect(screen.getByTestId("schematic-balance-applied")).toHaveTextContent(
      "-$15.00",
    );
    expect(screen.getByTestId("schematic-discount")).toHaveTextContent(
      "20% off for next 3 months",
    );
  });

  test("UpcomingBill renders the empty state for a 204", async () => {
    // No subscription is a 204 from the endpoint; the client reads it as no
    // next bill, and the element as content rather than a failure.
    renderStack(<UpcomingBill />, "tok", SCENARIOS.unbilled());
    expect(await screen.findByText("No upcoming invoice")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("UpcomingBill says it is not available for an account off the flag", async () => {
    // The flag middleware answers 404; that must never read as "nothing to
    // bill" for a customer who has a subscription.
    renderStack(<UpcomingBill />, "tok", SCENARIOS.pro(), false);
    expect(
      await screen.findByText(
        "Your upcoming invoice is not available for this account.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No upcoming invoice")).toBeNull();
  });

  test("UpcomingBill waits rather than failing while the session is pending", async () => {
    renderStack(<UpcomingBill />);
    expect(
      await screen.findByText("Loading your next bill"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a page prefetched by what its elements read makes no request of its own", async () => {
    // What `fetchBillingData` is for on a server-rendered page: the elements
    // declare what they read, the page prefetches exactly that, and the
    // provider seeds it, so nothing is fetched again after hydration.
    const fetchImpl = serve(SCENARIOS.pro());
    const client = new SchematicBillingClient({
      session: { company: "co_test", token: "tok" },
      apiUrl: "https://api.test",
      fetch: fetchImpl,
    });
    const names = billingResources(UpcomingBill, Invoices, Invoices);
    expect(names).toEqual(["upcomingInvoice", "invoices"]);
    const initialData = await fetchBillingData(client, { names });
    const requests = (fetchImpl as unknown as { mock: { calls: unknown[] } })
      .mock.calls.length;
    expect(requests).toBe(2);

    render(
      <SchematicProvider
        publishableKey="pk_test"
        billingClient={client}
        initialData={initialData}
        session={{ company: "co_test", token: "tok" }}
      >
        <UpcomingBill />
        <Invoices limit={2} />
      </SchematicProvider>,
    );
    expect(screen.getByTestId("schematic-upcoming-total")).toHaveTextContent(
      "$68.00",
    );
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(2);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      (fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls
        .length,
    ).toBe(requests);
  });

  test("Invoices waits rather than failing while the session is pending", async () => {
    // A host renders without a session until its auth resolves; that is
    // loading, not an error.
    renderStack(<Invoices />);
    expect(await screen.findByText("Loading invoices")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("PaymentMethods", async () => {
    renderStack(<PaymentMethods />, "tok");
    const pill = await screen.findByTestId("schematic-payment-method-current");
    expect(pill).toHaveTextContent("Card ending in 4444");
    expect(pill).not.toHaveTextContent("Chase");
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("PaymentMethods lists the other methods in its dialog", async () => {
    renderStack(<PaymentMethods />, "tok");
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Choose different payment method" }),
    );
    const rows = screen.getAllByTestId("schematic-payment-method");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Chase 6789");
    expect(rows[1]).toHaveTextContent("jo@example.com");
    expect(document.querySelector("dialog")).toHaveAttribute("open");
  });

  test("PaymentMethods renders the empty state for a 200 with no methods", async () => {
    // Nothing on file is an empty list, never a 204 and never a 404.
    renderStack(<PaymentMethods />, "tok", SCENARIOS.paymentMethodsEmpty());
    expect(
      await screen.findByText("No payment method added yet"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("PaymentMethods says it is not available for an account off the flag", async () => {
    renderStack(<PaymentMethods />, "tok", SCENARIOS.paymentMethods(), false);
    expect(
      await screen.findByText("Payment methods are not available"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No payment method added yet")).toBeNull();
  });

  test("PaymentMethods waits rather than failing while the session is pending", async () => {
    renderStack(<PaymentMethods />);
    expect(
      await screen.findByText("Loading payment methods"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a page prefetched for PaymentMethods makes no request of its own", async () => {
    const fetchImpl = serve(SCENARIOS.pro());
    const client = new SchematicBillingClient({
      session: { company: "co_test", token: "tok" },
      apiUrl: "https://api.test",
      fetch: fetchImpl,
    });
    const names = billingResources(PaymentMethods);
    expect(names).toEqual(["paymentMethods"]);
    const initialData = await fetchBillingData(client, { names });
    const calls = (fetchImpl as unknown as { mock: { calls: unknown[] } }).mock
      .calls;
    expect(calls).toHaveLength(1);

    render(
      <SchematicProvider
        publishableKey="pk_test"
        billingClient={client}
        initialData={initialData}
        session={{ company: "co_test", token: "tok" }}
      >
        <PaymentMethods />
      </SchematicProvider>,
    );
    expect(
      screen.getByTestId("schematic-payment-method-current"),
    ).toHaveTextContent("Card ending in 4444");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toHaveLength(1);
  });
});
