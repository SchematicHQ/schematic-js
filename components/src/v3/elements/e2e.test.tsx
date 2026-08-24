import { SchematicCatalogClient, toWire } from "@schematichq/schematic-js";
import { SchematicProvider } from "@schematichq/schematic-react";
import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { SCENARIOS } from "../fixtures/scenarios";

import { CreditUsage } from "./CreditUsage";
import { IncludedFeatures } from "./IncludedFeatures";
import { Invoices } from "./Invoices";
import { MeteredFeatures } from "./MeteredFeatures";
import { PlanManager } from "./PlanManager";
import { PricingTable } from "./PricingTable";
import { UpcomingBill } from "./UpcomingBill";

/**
 * The whole stack: wire JSON → schematic-js client → schematic-react store
 * and hooks → derivations → DOM, with fetch faked at the network edge.
 */
function serve(scenario: ReturnType<(typeof SCENARIOS)["pro"]>) {
  const routes: Record<string, unknown> = {
    "/catalog/view": { data: toWire(scenario.catalog) },
    "/public/catalog": { data: toWire(scenario.catalog) },
    "/company": { data: toWire(scenario.company) },
    "/company/usage": { data: { rows: toWire(scenario.usage) } },
    "/company/credits": { data: { balances: toWire(scenario.credits) } },
    "/company/upcoming-invoice": { data: toWire(scenario.upcomingInvoice) },
  };
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/company/invoices") {
      return new Response(
        JSON.stringify({ data: toWire(scenario.invoices?.invoices ?? []) }),
        { status: 200 },
      );
    }
    const body = routes[url.pathname];
    return new Response(JSON.stringify(body ?? { error: "not found" }), {
      status: body === undefined ? 404 : 200,
    });
  });
  return fetchImpl as unknown as typeof fetch;
}

function renderStack(ui: React.ReactNode, accessToken?: string) {
  const client = new SchematicCatalogClient({
    publishableKey: "pk_test",
    accessToken,
    apiUrl: "https://api.test",
    fetch: serve(SCENARIOS.pro()),
  });
  return render(
    <SchematicProvider publishableKey="pk_test" catalogClient={client}>
      {ui}
    </SchematicProvider>,
  );
}

describe("end to end", () => {
  test("PricingTable on the public tier", async () => {
    renderStack(<PricingTable />);
    const plans = await screen.findAllByTestId("sch-plan");
    expect(plans).toHaveLength(3);
    expect(within(plans[1]).getByTestId("sch-plan-price")).toHaveTextContent(
      "$49.00/month",
    );
  });

  test("PricingTable on the company tier marks the current plan", async () => {
    renderStack(<PricingTable />, "tok");
    const plans = await screen.findAllByTestId("sch-plan");
    expect(within(plans[1]).getByText("Current plan")).toBeInTheDocument();
  });

  test("PlanManager", async () => {
    renderStack(<PlanManager />, "tok");
    expect(await screen.findByText("Pro")).toBeInTheDocument();
    expect(screen.getByTestId("sch-plan-price")).toHaveTextContent("$49.00/mo");
    expect(screen.getByText("Advanced analytics")).toBeInTheDocument();
  });

  test("IncludedFeatures and MeteredFeatures", async () => {
    renderStack(
      <>
        <IncludedFeatures />
        <MeteredFeatures />
      </>,
      "tok",
    );
    expect(
      await screen.findByText("8,200 of 10,000 used • Resets 9/1"),
    ).toBeInTheDocument();
    expect(screen.getByText("8,200 API calls used")).toBeInTheDocument();
  });

  test("CreditUsage, Invoices, UpcomingBill", async () => {
    renderStack(
      <>
        <CreditUsage />
        <Invoices />
        <UpcomingBill />
      </>,
      "tok",
    );
    expect(
      await screen.findByText("880 AI credits remaining"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("sch-invoice")).toHaveLength(2);
    expect(screen.getByTestId("sch-upcoming-amount")).toHaveTextContent(
      "$61.20",
    );
  });

  test("company elements report the missing token rather than crashing", async () => {
    renderStack(<PlanManager />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/access token/);
  });
});
