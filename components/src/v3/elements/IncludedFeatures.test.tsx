import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { CatalogData, CompanyCatalog } from "../contract";
import { CatalogDataProvider } from "../data";
import { creditGrant, daysFromNow } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import {
  IncludedFeatures,
  type IncludedFeaturesProps,
} from "./IncludedFeatures";

function renderFeatures(
  data: CatalogData = SCENARIOS.pro(),
  props: IncludedFeaturesProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={data} status={status}>
      <IncludedFeatures visibleCount={10} {...props} />
    </CatalogDataProvider>,
  );
}

const row = (name: string) => within(screen.getByRole("listitem", { name }));

describe("IncludedFeatures", () => {
  test("renders a skeleton while usage loads", () => {
    renderFeatures({});
    expect(screen.getByLabelText("Loading included features")).toBeTruthy();
  });

  test("waits for the company before rendering rows", () => {
    const { usage } = SCENARIOS.pro();
    renderFeatures({ usage });
    expect(screen.getByLabelText("Loading included features")).toBeTruthy();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ usage: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <IncludedFeatures />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("usage");
  });

  test("renders the header and one row per usage row, boolean rows included", () => {
    renderFeatures();
    expect(
      screen.getByRole("heading", { name: "Included features" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("sch-feature")).toHaveLength(5);
    const dashboard = row("Dashboard");
    expect(dashboard.getByText("Dashboard")).toBeInTheDocument();
    expect(dashboard.queryByTestId("sch-feature-detail")).toBeNull();
  });

  test("a limited feature: allocation, count, and reset date", () => {
    renderFeatures();
    const calls = row("API call");
    expect(calls.getByText("10,000 API calls")).toBeInTheDocument();
    expect(
      calls.getByText("8,200 of 10,000 used • Resets 9/1"),
    ).toBeInTheDocument();
  });

  test("an overage feature carries its accrued cost", () => {
    renderFeatures(SCENARIOS.overLimit());
    expect(
      row("API call").getByText("12,400 of 10,000 used • $48.00 • Resets 9/1"),
    ).toBeInTheDocument();
  });

  test("pay in advance: the committed quantity, unit price, and cost per period", () => {
    renderFeatures();
    const seats = row("Seat");
    expect(seats.getByText("5 seats")).toBeInTheDocument();
    expect(seats.getByText("$15.00/seat/mo • $75.00/mo")).toBeInTheDocument();
  });

  test("credit burndown: the rate, or the remaining equivalent when credits are hidden", () => {
    const { unmount } = renderFeatures();
    const images = row("Image generation");
    expect(images.getByText("2 AI credits per use")).toBeInTheDocument();
    expect(
      images.getByText("60 image generations used • Resets 9/1"),
    ).toBeInTheDocument();
    unmount();

    renderFeatures(SCENARIOS.pro(), { showCredits: false });
    expect(
      row("Image generation").getByText("190 image generations remaining"),
    ).toBeInTheDocument();
  });

  test("unlimited features", () => {
    renderFeatures();
    const projects = row("Project");
    expect(projects.getByText("Unlimited projects")).toBeInTheDocument();
    expect(projects.getByText("12 used")).toBeInTheDocument();
  });

  test("a free plan without a subscription still shows counts", () => {
    renderFeatures(SCENARIOS.free());
    expect(
      row("API call").getByText("950 of 1,000 used • Resets 9/1"),
    ).toBeInTheDocument();
    expect(row("Seat").getByText("2 of 3 used")).toBeInTheDocument();
  });

  test("expiration renders as an italic line", () => {
    const data = SCENARIOS.pro();
    data.usage![1] = { ...data.usage![1], expiresAt: daysFromNow(30) };
    const { unmount } = renderFeatures(data);
    const expires = row("API call").getByText(/^Expires Sep 20, 2026$/);
    expect(expires.tagName).toBe("EM");
    unmount();

    renderFeatures(data, { showExpiration: false });
    expect(screen.queryByText(/^Expires/)).toBeNull();
  });

  test("per-license credit grants on the current plan read under the license feature", () => {
    const data = SCENARIOS.pro();
    const catalog = data.catalog as CompanyCatalog;
    catalog.plans[1].includedCreditGrants.push(
      creditGrant({
        id: "grant_seat_ai",
        credit: catalog.plans[1].includedCreditGrants[0].credit,
        amount: 100,
        companyAmount: 0,
        scaling: "per_license",
        licenseId: "feat_seats",
        resetCadence: "monthly",
      }),
    );
    const { unmount } = renderFeatures(data);
    expect(
      row("Seat").getByText("100 AI credits per seat per month"),
    ).toBeInTheDocument();
    expect(row("API call").queryByText(/AI credits per/)).toBeNull();
    unmount();

    renderFeatures(data, { showCredits: false });
    expect(screen.queryByText("100 AI credits per seat per month")).toBeNull();
  });

  test("works without the catalog resource", () => {
    const { usage, company } = SCENARIOS.pro();
    renderFeatures({ usage, company });
    expect(screen.getAllByTestId("sch-feature")).toHaveLength(5);
  });

  test("hard limits are disclosed only when asked", () => {
    const { unmount } = renderFeatures();
    expect(screen.queryByText(/Up to a limit of/)).toBeNull();
    unmount();

    renderFeatures(SCENARIOS.pro(), { showHardLimit: true });
    expect(
      row("API call").getByText("Up to a limit of 10,000 API calls"),
    ).toBeInTheDocument();
  });

  test("display toggles: icons, descriptions, usage, header", () => {
    renderFeatures(SCENARIOS.free(), {
      showDescription: false,
      showHeader: false,
      showIcons: false,
      showUsage: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("Requests to the public API.")).toBeNull();
    expect(document.querySelector(".schematic-icon")).toBeNull();
    expect(screen.queryByText(/used/)).toBeNull();
    expect(row("API call").getByText("1,000 API calls")).toBeInTheDocument();
  });

  test("visibleFeatures filters and orders the rows", () => {
    renderFeatures(SCENARIOS.pro(), {
      visibleFeatures: ["feat_seats", "feat_dashboard", "feat_missing"],
    });
    const rows = screen.getAllByTestId("sch-feature");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAccessibleName("Seat");
    expect(rows[1]).toHaveAccessibleName("Dashboard");
  });

  test("collapses long lists behind See all", () => {
    renderFeatures(SCENARIOS.pro(), { visibleCount: 2 });
    expect(screen.getAllByTestId("sch-feature")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "See all" }));
    expect(screen.getAllByTestId("sch-feature")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    expect(screen.getAllByTestId("sch-feature")).toHaveLength(2);
  });

  test("renders the empty state when the company holds no features", () => {
    renderFeatures(SCENARIOS.noPlan());
    expect(screen.getByTestId("sch-empty")).toHaveTextContent(
      "No features included",
    );
  });
});
