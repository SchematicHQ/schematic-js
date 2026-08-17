import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { IncludedFeatures } from "./IncludedFeatures";

const state = vi.hoisted(() => ({
  features: [] as unknown[],
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      data: {
        company: { plan: { includedCreditGrants: [] }, addOns: [] },
        featureUsage: { features: state.features },
      },
      settings: defaultSettings,
    }),
    useIsLightBackground: () => true,
  };
});

const featuresFor = (count: number) =>
  Array.from(
    { length: count },
    (_, index) =>
      ({
        feature: {
          id: `feature-${index}`,
          name: `Feature ${index}`,
          featureType: "boolean",
        },
        access: true,
      }) as unknown as FeatureUsageResponseData,
  );

const namesFor = (count: number) =>
  Array.from({ length: count }, (_, index) => `Feature ${index}`);

const featureNames = () =>
  screen.queryAllByText(/^Feature \d+$/).map((node) => node.textContent);

// Two past the limit, so collapsing is observable in both directions.
const OVER_LIMIT = VISIBLE_ENTITLEMENT_COUNT + 2;

beforeEach(() => {
  state.features = [];
});

describe("`IncludedFeatures` truncation", () => {
  test("caps the list at the visible limit", () => {
    state.features = featuresFor(OVER_LIMIT);

    render(<IncludedFeatures />);

    expect(featureNames()).toEqual(namesFor(VISIBLE_ENTITLEMENT_COUNT));
    expect(screen.getByText("See all")).toBeInTheDocument();
  });

  test("expands to the full list and collapses back", () => {
    state.features = featuresFor(OVER_LIMIT);

    render(<IncludedFeatures />);

    fireEvent.click(screen.getByText("See all"));
    expect(featureNames()).toEqual(namesFor(OVER_LIMIT));

    fireEvent.click(screen.getByText("Hide all"));
    expect(featureNames()).toHaveLength(VISIBLE_ENTITLEMENT_COUNT);
  });

  test("renders no toggle when the list is at the limit", () => {
    state.features = featuresFor(VISIBLE_ENTITLEMENT_COUNT);

    render(<IncludedFeatures />);

    expect(featureNames()).toHaveLength(VISIBLE_ENTITLEMENT_COUNT);
    expect(screen.queryByText("See all")).not.toBeInTheDocument();
  });

  test("expands from the chevron as well as the label", () => {
    state.features = featuresFor(OVER_LIMIT);

    const { container } = render(<IncludedFeatures />);

    fireEvent.click(container.querySelector('[title="chevron-down"]')!);
    expect(featureNames()).toHaveLength(OVER_LIMIT);
  });
});
