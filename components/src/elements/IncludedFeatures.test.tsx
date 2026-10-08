import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import {
  IncludedFeatures,
  type IncludedFeaturesProps,
} from "./IncludedFeatures";
import { featureUsage, meteredPrice } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderFeatures(
  data: BillingData = SCENARIOS.featureUsage(),
  props: IncludedFeaturesProps = {},
  handlers: {
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    onRefetch?: React.ComponentProps<typeof BillingDataProvider>["onRefetch"];
  } = {},
) {
  return render(
    <BillingDataProvider
      data={data}
      status={handlers.status}
      onRefetch={handlers.onRefetch}
    >
      <IncludedFeatures locale={L} {...props} />
    </BillingDataProvider>,
  );
}

function row(name: string): HTMLElement {
  const rows = screen.getAllByTestId("schematic-included-feature");
  const found = rows.find((r) => within(r).queryByText(name) !== null);
  if (found === undefined) {
    throw new Error(`no row for ${name}`);
  }
  return found;
}

describe("IncludedFeatures", () => {
  test("says the features are loading", () => {
    renderFeatures({});
    expect(
      screen.getByText("Loading features").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("renders the error copy with Try again", () => {
    const onRefetch = vi.fn();
    renderFeatures(
      {},
      {},
      { status: { featureUsage: { error: new Error("Boom") } }, onRefetch },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your features.",
    );
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRefetch).toHaveBeenCalledWith("featureUsage");
  });

  test("says features are not available on a 404", () => {
    renderFeatures(
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
      "Features are not available for this account.",
    );
  });

  test("entitled to nothing is the heading over an empty list", () => {
    renderFeatures(SCENARIOS.featureUsageEmpty());
    expect(
      screen.getByRole("heading", { name: "Included features" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("schematic-included-feature")).toHaveLength(
      0,
    );
  });

  test("shows four features, then all of them on See all", () => {
    renderFeatures();
    expect(screen.getAllByTestId("schematic-included-feature")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "See all" }));
    expect(screen.getAllByTestId("schematic-included-feature")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Hide all" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("an allocation reads as units; a metric that resets says when", () => {
    renderFeatures();
    const api = row("API call");
    expect(api).toHaveTextContent("1,000 API calls");
    expect(api).toHaveTextContent("Resets Sep 1");
    // The "of N used" summary is only a fallback for a row with no usage line.
    expect(api).not.toHaveTextContent("used");
  });

  test("an allocation with nothing else to say reads its usage against it", () => {
    renderFeatures({ featureUsage: [featureUsage({ resetsAt: undefined })] });
    expect(row("API call")).toHaveTextContent("250 of 1,000 used");
  });

  test("pay in advance reads the quantity, its unit price, and the cost per period", () => {
    renderFeatures();
    const seats = row("Seat");
    expect(seats).toHaveTextContent("12 Seats");
    expect(seats).toHaveTextContent("$15.00/Seat/mo");
    expect(seats).toHaveTextContent("$180.00/mo");
    expect(seats).toHaveTextContent("Includes 10 AI credits per Seat");
  });

  test("pay as you go reads the package price and what it has cost", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_storage"] });
    const storage = row("GB of storage");
    expect(storage).toHaveTextContent("$0.02 per 100 GB of storage");
    expect(storage).toHaveTextContent("1,300 GB of storage used • $0.26");
  });

  test("overage reads the soft limit and the cost past it", () => {
    renderFeatures();
    const emails = row("Email");
    expect(emails).toHaveTextContent("1,000 Emails");
    expect(emails).toHaveTextContent("1,300 Emails used • $15.00");
  });

  test("tier pricing reads the current tier and offers the tiers", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_builds"] });
    const builds = row("Build");
    expect(builds).toHaveTextContent("Up to 50 Builds in this tier");
    expect(
      within(builds).getByRole("button", { name: "Tiered pricing" }),
    ).toBeInTheDocument();
    const tip = within(builds).getByRole("tooltip");
    expect(tip).toHaveTextContent("1–50");
    expect(tip).toHaveTextContent("51+");
    expect(tip).toHaveTextContent("Price by unit based on final tier reached.");
  });

  test("a credit-burning feature reads credits per use, from an override too", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_generations"] });
    expect(row("Generation")).toHaveTextContent("2 AI credits per use");
  });

  test("showCredits false drops the per-use line", () => {
    renderFeatures(undefined, {
      showCredits: false,
      visibleFeatures: ["feat_generations"],
    });
    expect(row("Generation")).not.toHaveTextContent("per use");
  });

  test("an override shows when it expires", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_exports"] });
    expect(row("Export")).toHaveTextContent(/Expires Sep 20, 2026/);
  });

  test("a boolean feature shows its name and description only", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_sso"] });
    const sso = row("SSO");
    expect(sso).toHaveTextContent("SSO");
    expect(sso.querySelector(".schematic-included-features__usage")).toBeNull();
  });

  test("the hard limit tip shows only when asked for", () => {
    const data = {
      featureUsage: [
        featureUsage({
          featureName: "Email",
          priceBehavior: "overage",
          softLimit: 100,
          price: meteredPrice(),
        }),
      ],
    };
    const { unmount } = renderFeatures(data);
    expect(screen.queryByRole("button", { name: "Limit" })).toBeNull();
    unmount();
    renderFeatures(data, { showHardLimit: true });
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Up to a limit of 1,000 Emails",
    );
  });

  test("the warning threshold replaces the limit when asked for", () => {
    const data = {
      featureUsage: [
        featureUsage({ resetsAt: undefined, warningThreshold: 800 }),
      ],
    };
    renderFeatures(data, { showWarningThresholdAsLimit: true });
    expect(row("API call")).toHaveTextContent("800 API calls");
    expect(row("API call")).toHaveTextContent("250 of 800 used");
  });

  test("visibleFeatures orders and filters the rows", () => {
    renderFeatures(undefined, { visibleFeatures: ["feat_sso", "feat_api"] });
    const names = screen
      .getAllByTestId("schematic-included-feature")
      .map(
        (r) =>
          r.querySelector(".schematic-included-features__name")?.textContent,
      );
    expect(names).toEqual(["SSO", "API call"]);
  });

  test("the toggles hide what they name", () => {
    renderFeatures(undefined, {
      showHeader: false,
      showIcon: false,
      showDescription: false,
      showUsage: false,
      visibleFeatures: ["feat_api"],
    });
    expect(screen.queryByRole("heading")).toBeNull();
    const api = row("API call");
    expect(api.querySelector(".schematic-icon")).toBeNull();
    expect(api).not.toHaveTextContent("Requests to the public API");
    expect(api).not.toHaveTextContent("used");
    expect(api).toHaveTextContent("1,000 API calls");
  });
});
