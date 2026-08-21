import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { CatalogData } from "../contract";
import { CatalogDataProvider } from "../data";
import {
  entitlement,
  feature,
  tieredPrice,
  usageOf,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { MeteredFeatures, type MeteredFeaturesProps } from "./MeteredFeatures";

function renderUsage(
  data: CatalogData = SCENARIOS.pro(),
  props: MeteredFeaturesProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={data} status={status}>
      <MeteredFeatures {...props} />
    </CatalogDataProvider>,
  );
}

const card = (name: string) => within(screen.getByRole("article", { name }));

describe("MeteredFeatures", () => {
  test("renders a skeleton while usage loads", () => {
    renderUsage({});
    expect(screen.getByLabelText("Loading usage")).toBeTruthy();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ usage: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <MeteredFeatures />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("usage");
  });

  test("renders one card per metered feature, skipping boolean ones", () => {
    renderUsage();
    expect(screen.getByRole("heading", { name: "Usage" })).toBeInTheDocument();
    const cards = screen.getAllByTestId("sch-metered-feature");
    expect(cards).toHaveLength(4);
    expect(screen.queryByRole("article", { name: "Dashboard" })).toBeNull();
  });

  test("a limited feature: usage, allocation with reset, meter, and overage rate", () => {
    renderUsage();
    const calls = card("API call");
    expect(calls.getByText("8,200 API calls used")).toBeInTheDocument();
    expect(
      calls.getByText("10,000 API calls • Resets 9/1"),
    ).toBeInTheDocument();
    const meter = calls.getByRole("meter", { name: "API call" });
    expect(meter).toHaveAttribute("aria-valuenow", "82");
    expect(meter).toHaveClass("schematic-meter--ok");
    expect(calls.getByText("8,200/10,000")).toBeInTheDocument();
    const overage = calls.getByTestId("sch-overage");
    expect(overage).toHaveTextContent("Additional: $0.02/API call");
    expect(overage).not.toHaveTextContent("·");
  });

  test("over the limit: the meter turns over and the footer totals the overage", () => {
    renderUsage(SCENARIOS.overLimit());
    const calls = card("API call");
    expect(calls.getByText("12,400 API calls used")).toBeInTheDocument();
    expect(calls.getByRole("meter")).toHaveClass("schematic-meter--over");
    expect(calls.getByRole("meter")).toHaveAttribute("aria-valuenow", "100");
    expect(calls.getByTestId("sch-overage")).toHaveTextContent(
      "Additional: $0.02/API call2,400 API calls · $48.00",
    );
  });

  test("the meter warns past the server threshold, or the consumer's percent", () => {
    const { unmount } = renderUsage(SCENARIOS.free());
    expect(card("API call").getByRole("meter")).toHaveClass(
      "schematic-meter--warning",
    );
    expect(card("Seat").getByRole("meter")).toHaveClass("schematic-meter--ok");
    unmount();

    renderUsage(SCENARIOS.free(), { warningPercent: 50 });
    expect(card("Seat").getByRole("meter")).toHaveClass(
      "schematic-meter--warning",
    );
  });

  test("pay in advance: committed quantity, unit price, cost, and an Add more CTA", () => {
    const onAddMore = vi.fn();
    renderUsage(SCENARIOS.pro(), { onAddMore });
    const seats = card("Seat");
    expect(seats.getByText("5 seats")).toBeInTheDocument();
    expect(seats.getByText("$15.00/seat/mo • $75.00/mo")).toBeInTheDocument();
    expect(seats.getByRole("meter")).toHaveAttribute("aria-valuenow", "80");
    expect(seats.getByText("4/5")).toBeInTheDocument();
    fireEvent.click(seats.getByRole("button", { name: "Add more" }));
    expect(onAddMore).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: expect.objectContaining({ id: "feat_seats" }),
      }),
      expect.objectContaining({ canAddMore: true }),
    );
    expect(
      card("API call").queryByRole("button", { name: "Add more" }),
    ).toBeNull();
  });

  test("Add more renders as a link when a URL is given", () => {
    renderUsage(SCENARIOS.pro(), {
      addMoreUrl: "/billing/seats",
      addMoreTarget: "_blank",
    });
    const link = card("Seat").getByRole("link", { name: "Add more" });
    expect(link).toHaveAttribute("href", "/billing/seats");
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("Add more is withheld when checkout is off or the catalog is absent", () => {
    const data = SCENARIOS.pro();
    data.catalog = {
      ...data.catalog!,
      capabilities: { checkout: false },
    };
    const { unmount } = renderUsage(data);
    expect(screen.queryByRole("button", { name: "Add more" })).toBeNull();
    unmount();

    const { usage, company } = SCENARIOS.pro();
    renderUsage({ usage, company });
    expect(screen.getAllByTestId("sch-metered-feature")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Add more" })).toBeNull();
  });

  test("credit burndown shows the rate and no meter; unlimited shows no meter", () => {
    renderUsage();
    const images = card("Image generation");
    expect(images.getByText("60 image generations used")).toBeInTheDocument();
    expect(
      images.getByText("2 AI credits per use • Resets 9/1"),
    ).toBeInTheDocument();
    expect(images.queryByRole("meter")).toBeNull();
    const projects = card("Project");
    expect(projects.getByText("12 projects used")).toBeInTheDocument();
    expect(projects.getByText("Unlimited projects")).toBeInTheDocument();
    expect(projects.queryByRole("meter")).toBeNull();
  });

  test("tiered pricing names the current band and lists the table", () => {
    const data = SCENARIOS.pro();
    const calls = entitlement({
      id: "ent_tiered",
      feature: feature({
        id: "feat_messages",
        name: "Message",
        singularName: "message",
        pluralName: "messages",
        type: "event",
      }),
      valueType: "numeric",
      valueBool: null,
      priceBehavior: "tier",
      metricPeriod: "current_month",
      meteredPrices: [
        tieredPrice([
          [1000, 0],
          [5000, 1],
          [null, 2],
        ]),
      ],
    });
    data.usage = [
      usageOf(calls, {
        usage: 2500,
        effectiveLimit: null,
        currentCost: 1500,
        currentCostCurrency: "usd",
      }),
    ];
    renderUsage(data);
    const messages = card("Message");
    expect(messages.getByText("2,500 messages used")).toBeInTheDocument();
    expect(
      messages.getByText("Up to 5,000 messages in this tier • Resets 9/1"),
    ).toBeInTheDocument();
    expect(messages.queryByRole("meter")).toBeNull();
    const tier = messages.getByTestId("sch-tier");
    expect(tier).toHaveTextContent("Tier: 1,001–5,000");
    expect(tier).toHaveTextContent("$15.00");
    expect(tier).toHaveTextContent(
      "1–1,000: $0.00 · 1,001–5,000: $0.01 · 5,001–∞: $0.02",
    );
  });

  test("hard limits are disclosed only when asked", () => {
    renderUsage(SCENARIOS.pro(), { showHardLimit: true });
    expect(
      card("API call").getByText("Up to a limit of 10,000 API calls"),
    ).toBeInTheDocument();
  });

  test("display toggles: header, icons, description, allocation, usage, meter", () => {
    renderUsage(SCENARIOS.pro(), {
      showAllocation: false,
      showDescription: false,
      showHeader: false,
      showIcons: false,
      showMeter: false,
      showUsage: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(document.querySelector(".schematic-icon")).toBeNull();
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.queryByText(/used$/)).toBeNull();
    expect(screen.queryByText(/Resets/)).toBeNull();
    expect(card("API call").getByTestId("sch-overage")).toBeInTheDocument();
  });

  test("visibleFeatures filters and orders the cards", () => {
    renderUsage(SCENARIOS.pro(), {
      visibleFeatures: ["feat_projects", "feat_dashboard", "feat_seats"],
    });
    const cards = screen.getAllByTestId("sch-metered-feature");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAccessibleName("Project");
    expect(cards[1]).toHaveAccessibleName("Seat");
  });

  test("renders the empty state when nothing is metered", () => {
    renderUsage(SCENARIOS.noPlan());
    expect(screen.getByTestId("sch-empty")).toHaveTextContent(
      "No usage to show",
    );
  });
});
