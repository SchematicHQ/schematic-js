import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { type FeatureUsageResponseData } from "../../api/checkoutexternal";

import {
  IncludedFeatures,
  IncludedFeaturesContext,
  type IncludedFeaturesContextValue,
} from ".";

const features = [
  { feature: { id: "f1", name: "Feature 1" } },
  { feature: { id: "f2", name: "Feature 2" } },
] as FeatureUsageResponseData[];

function withContext(
  ui: React.ReactNode,
  overrides: Partial<IncludedFeaturesContextValue> = {},
) {
  const value: IncludedFeaturesContextValue = {
    featureUsage: features,
    displayedFeatures: features,
    shouldShow: true,
    hasMore: false,
    expanded: false,
    toggle: vi.fn(),
    ...overrides,
  };
  return render(
    <IncludedFeaturesContext.Provider value={value}>
      {ui}
    </IncludedFeaturesContext.Provider>,
  );
}

describe("IncludedFeatures primitives", () => {
  test("Content exposes displayed features when shouldShow is true", () => {
    withContext(
      <IncludedFeatures.Content>
        {({ displayedFeatures }) => (
          <ul>
            {displayedFeatures.map((f) => (
              <li key={f.feature?.id}>{f.feature?.name}</li>
            ))}
          </ul>
        )}
      </IncludedFeatures.Content>,
    );

    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();
  });

  test("Content renders nothing when shouldShow is false", () => {
    withContext(
      <IncludedFeatures.Content>{() => <span>x</span>}</IncludedFeatures.Content>,
      { shouldShow: false },
    );
    expect(screen.queryByText("x")).not.toBeInTheDocument();
  });

  test("ToggleMore gates on hasMore", () => {
    withContext(
      <IncludedFeatures.ToggleMore>
        {() => <span>toggle</span>}
      </IncludedFeatures.ToggleMore>,
    );
    expect(screen.queryByText("toggle")).not.toBeInTheDocument();
  });
});
