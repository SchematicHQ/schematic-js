import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
  type FeatureUserUsage,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { MeteredFeatures, type MeteredFeaturesProps } from "./MeteredFeatures";
import {
  featureUsage,
  featureUserUsage,
  meteredPrice,
} from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderUsage(
  data: BillingData = SCENARIOS.featureUsage(),
  props: MeteredFeaturesProps = {},
  handlers: {
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    featureUserUsage?: Record<string, FeatureUserUsage>;
  } = {},
) {
  return render(
    <BillingDataProvider
      data={data}
      featureUserUsage={handlers.featureUserUsage}
      status={handlers.status}
    >
      <MeteredFeatures locale={L} {...props} />
    </BillingDataProvider>,
  );
}

function card(name: string): HTMLElement {
  return screen.getByRole("heading", { name }).closest("li") as HTMLElement;
}

describe("MeteredFeatures", () => {
  test("says usage is loading", () => {
    renderUsage({});
    expect(
      screen.getByText("Loading usage").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("says usage is not available on a 404", () => {
    renderUsage(
      {},
      {},
      {
        status: {
          featureUsage: {
            error: new SchematicApiError(404, "/company/usage", "not found"),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Usage is not available for this account.",
    );
  });

  test("renders nothing without a metered feature", () => {
    const { container } = renderUsage({
      featureUsage: [featureUsage({ featureType: "boolean" })],
    });
    expect(container).toBeEmptyDOMElement();
  });

  test("shows event and trait features, a card each, and no boolean", () => {
    renderUsage();
    expect(screen.getAllByTestId("schematic-metered-feature")).toHaveLength(7);
    expect(screen.queryByRole("heading", { name: "SSO" })).toBeNull();
  });

  test("has no heading by default, and each name takes the heading level", () => {
    renderUsage(undefined, { headingLevel: 3 });
    expect(screen.queryByRole("heading", { name: "Usage" })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 3, name: "API call" }),
    ).toBeInTheDocument();
  });

  test("shows the heading on request, with each name one level below", () => {
    renderUsage(undefined, { showHeader: true });
    expect(
      screen.getByRole("heading", { level: 2, name: "Usage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "API call" }),
    ).toBeInTheDocument();
  });

  test("an allocation reads what is used against its limit, with a meter", () => {
    renderUsage();
    const api = card("API call");
    expect(api).toHaveTextContent("250 API calls used");
    expect(api).toHaveTextContent("Limit of 1,000 • Resets Sep 1");
    const meter = within(api).getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "250");
    expect(meter).toHaveAttribute("aria-valuemax", "1000");
    expect(api).toHaveTextContent("250/1,000");
  });

  test("pay in advance reads the quantity and what is in use, and offers Add More", () => {
    const onAddMore = vi.fn();
    renderUsage(undefined, { onAddMore });
    const seats = card("Seat");
    expect(seats).toHaveTextContent("12 Seats");
    expect(seats).toHaveTextContent("9 used");
    fireEvent.click(within(seats).getByRole("button", { name: "Add More" }));
    expect(onAddMore).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: "feat_seats" }),
    );
  });

  test("Add More links when given a URL, and is absent without either", () => {
    const { unmount } = renderUsage(undefined, { addMoreUrl: "/buy" });
    expect(
      within(card("Seat")).getByRole("link", { name: "Add More" }),
    ).toHaveAttribute("href", "/buy");
    unmount();
    renderUsage();
    expect(screen.queryByText("Add More")).toBeNull();
  });

  test("pay as you go reads its cost and has no meter", () => {
    renderUsage();
    const storage = card("GB of storage");
    expect(storage).toHaveTextContent("$0.26");
    expect(within(storage).queryByRole("meter")).toBeNull();
  });

  test("overage reads what is included and prices what is past it", () => {
    renderUsage();
    const emails = card("Email");
    expect(emails).toHaveTextContent("1,000 included");
    expect(emails).toHaveTextContent("Additional: $0.05/Email");
    expect(emails).toHaveTextContent("300 Emails · $15.00");
    expect(within(emails).getByRole("meter")).toHaveAttribute(
      "data-tone",
      "overage",
    );
  });

  test("tier pricing reads the tier and offers the tiers", () => {
    renderUsage();
    const builds = card("Build");
    expect(builds).toHaveTextContent("Up to 50 Builds in this tier");
    expect(builds).toHaveTextContent("Tier: 1–50");
    expect(within(builds).getByRole("tooltip")).toHaveTextContent("51+");
    expect(within(builds).getByRole("meter")).toHaveAttribute(
      "data-tone",
      "tier",
    );
  });

  test("the tier line formats its amount and counts the feature by it", () => {
    const tiered = (to: number) => ({
      featureUsage: [
        featureUsage({
          featureName: "Build",
          priceBehavior: "tier",
          allocation: to * 2,
          usage: 0,
          price: meteredPrice({
            price: 0,
            scheme: "tiered",
            tiersMode: "volume",
            priceTiers: [
              { from: 0, to, perUnitPrice: 10 },
              { from: to + 1, perUnitPrice: 8 },
            ],
          }),
        }),
      ],
    });
    const { unmount } = renderUsage(tiered(1000));
    expect(card("Build")).toHaveTextContent("Up to 1,000 Builds in this tier");
    expect(card("Build")).toHaveTextContent("Tier: 1–1,000");
    unmount();
    renderUsage(tiered(1));
    expect(card("Build")).toHaveTextContent("Up to 1 Build in this tier");
  });

  test("a credit-burning feature reads credits per use, with no meter", () => {
    renderUsage();
    const generations = card("Generation");
    expect(generations).toHaveTextContent("2 AI credits per use");
    expect(within(generations).queryByRole("meter")).toBeNull();
  });

  test("the meter warns and then turns critical as the limit nears", () => {
    renderUsage();
    expect(within(card("Seat")).getByRole("meter")).toHaveAttribute(
      "data-tone",
      "warning",
    );
    expect(within(card("Export")).getByRole("meter")).toHaveAttribute(
      "data-tone",
      "critical",
    );
  });

  test("the warning threshold replaces the limit when asked for", () => {
    renderUsage(
      {
        featureUsage: [
          featureUsage({ resetsAt: undefined, warningThreshold: 800 }),
        ],
      },
      { showWarningThresholdAsLimit: true },
    );
    const api = card("API call");
    expect(api).toHaveTextContent("Limit of 800");
    expect(within(api).getByRole("meter")).toHaveAttribute(
      "aria-valuemax",
      "800",
    );
  });

  test("usage by user lists the heaviest three, then twenty with the rest", () => {
    renderUsage(
      undefined,
      { visibleFeatures: ["feat_api"] },
      {
        featureUserUsage: { feat_api: featureUserUsage() },
      },
    );
    const api = card("API call");
    expect(api).toHaveTextContent("Usage by user");
    expect(api).toHaveTextContent(
      "260 API calls used by your team this period",
    );
    const names = () =>
      Array.from(api.querySelectorAll(".schematic-usage-by-user__name")).map(
        (n) => n.textContent,
      );
    expect(names()).toEqual(["Ada", "Bo", "Cy"]);
    fireEvent.click(
      within(api).getByRole("button", { name: "Show all 5 users" }),
    );
    expect(names()).toEqual(["Ada", "Bo", "Cy", "Dan", "Eve", "Unattributed"]);
    expect(
      within(api).getByRole("button", { name: "Show fewer" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("usage by user offers the top twenty when there are more", () => {
    renderUsage(
      undefined,
      { visibleFeatures: ["feat_api"] },
      {
        featureUserUsage: { feat_api: featureUserUsage({ count: 45 }) },
      },
    );
    const api = card("API call");
    fireEvent.click(
      within(api).getByRole("button", { name: "Show top 20 users" }),
    );
    expect(api).toHaveTextContent("plus 40 more");
  });

  test("usage by user says nothing while it loads", () => {
    renderUsage(undefined, { visibleFeatures: ["feat_api"] });
    expect(card("API call")).not.toHaveTextContent("Usage by user");
  });

  test("usage by user is for event features only", () => {
    renderUsage(
      undefined,
      { visibleFeatures: ["feat_seats"] },
      {
        featureUserUsage: { feat_seats: featureUserUsage() },
      },
    );
    expect(card("Seat")).not.toHaveTextContent("Usage by user");
  });

  test("the toggles hide what they name", () => {
    renderUsage(
      undefined,
      {
        showAllocation: false,
        showDescription: false,
        showIcon: false,
        showMeter: false,
        showUsage: false,
        showUsageByUser: false,
        visibleFeatures: ["feat_api"],
      },
      { featureUserUsage: { feat_api: featureUserUsage() } },
    );
    const api = card("API call");
    expect(api.querySelector(".schematic-metered-features__icon")).toBeNull();
    expect(within(api).queryByRole("meter")).toBeNull();
    expect(api).not.toHaveTextContent("used");
    expect(api).not.toHaveTextContent("Limit of");
    expect(api).not.toHaveTextContent("Requests to the public API");
  });
});
