import type { FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { render, screen } from "../../../test/setup";

import { UsageViolationText } from "./UsageViolationText";

const createMockViolation = (
  featureName?: string,
): Partial<FeatureUsageResponseData> => ({
  feature: featureName
    ? ({
        id: `feat_${featureName.toLowerCase().replace(/\s/g, "_")}`,
        name: featureName,
      } as FeatureUsageResponseData["feature"])
    : undefined,
});

describe("`UsageViolationText` component", () => {
  test("does not render when violations array is empty", () => {
    const { container } = render(<UsageViolationText violations={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders with a single violation", () => {
    const violations = [
      createMockViolation("API Calls"),
    ] as FeatureUsageResponseData[];

    render(<UsageViolationText violations={violations} />);

    expect(
      screen.getByText(/API Calls usage is over the limit/),
    ).toBeInTheDocument();
  });

  test("renders a list when multiple violations are present", () => {
    const violations = [
      createMockViolation("API Calls"),
      createMockViolation("Storage"),
      createMockViolation("Seats"),
    ] as FeatureUsageResponseData[];

    render(<UsageViolationText violations={violations} />);

    expect(
      screen.getByText(/API Calls, Storage, and Seats usage is over the limit/),
    ).toBeInTheDocument();
  });

  test("handles violations with missing feature gracefully", () => {
    const violations = [
      createMockViolation(undefined),
      createMockViolation("API Calls"),
    ] as FeatureUsageResponseData[];

    render(<UsageViolationText violations={violations} />);

    expect(
      screen.getByText(/API Calls usage is over the limit/),
    ).toBeInTheDocument();
  });
});
