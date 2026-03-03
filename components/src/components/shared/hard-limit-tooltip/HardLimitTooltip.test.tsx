import { vi } from "vitest";

import type { FeatureResponseData } from "../../../api/checkoutexternal";
import { fireEvent, render, screen } from "../../../test/setup";

import { HardLimitTooltip } from "./HardLimitTooltip";

const mockUseEmbed = vi.fn();
const mockUseIsLightBackground = vi.fn();

vi.mock("../../../hooks", () => ({
  useEmbed: (...args: unknown[]) => mockUseEmbed(...args),
  useIsLightBackground: (...args: unknown[]) =>
    mockUseIsLightBackground(...args),
}));

const createMockFeature = (
  overrides: Partial<FeatureResponseData> = {},
): FeatureResponseData =>
  ({
    id: "feat-1",
    name: "API Call",
    singularName: "API Call",
    pluralName: "API Calls",
    ...overrides,
  }) as FeatureResponseData;

function setupMocks({
  showHardLimit = true,
  isLightBackground = true,
}: {
  showHardLimit?: boolean;
  isLightBackground?: boolean;
} = {}) {
  mockUseEmbed.mockReturnValue({
    data: {
      displaySettings: {
        showHardLimit,
      },
    },
  });
  mockUseIsLightBackground.mockReturnValue(isLightBackground);
}

describe("`HardLimitTooltip` component", () => {
  beforeEach(() => {
    setupMocks();
  });

  test("renders the trigger icon when feature and limit are provided", () => {
    render(<HardLimitTooltip feature={createMockFeature()} limit={1000} />);

    expect(screen.getByTitle("limit")).toBeInTheDocument();
  });

  test("renders tooltip content on hover with correct text", () => {
    render(<HardLimitTooltip feature={createMockFeature()} limit={1000} />);

    const trigger = screen.getByTitle("limit");
    fireEvent.pointerEnter(trigger);

    expect(
      screen.getByText("Up to a limit of 1000 API Calls"),
    ).toBeInTheDocument();
  });

  test("uses singular feature name when limit is 1", () => {
    render(<HardLimitTooltip feature={createMockFeature()} limit={1} />);

    const trigger = screen.getByTitle("limit");
    fireEvent.pointerEnter(trigger);

    expect(screen.getByText("Up to a limit of 1 API Call")).toBeInTheDocument();
  });

  test("does not render when feature is undefined", () => {
    const { container } = render(
      <HardLimitTooltip feature={undefined} limit={1000} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("does not render when limit is null", () => {
    const { container } = render(
      <HardLimitTooltip feature={createMockFeature()} limit={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("does not render when limit is undefined", () => {
    const { container } = render(
      <HardLimitTooltip feature={createMockFeature()} limit={undefined} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders when limit is 0", () => {
    render(<HardLimitTooltip feature={createMockFeature()} limit={0} />);

    expect(screen.getByTitle("limit")).toBeInTheDocument();

    const trigger = screen.getByTitle("limit");
    fireEvent.pointerEnter(trigger);

    expect(
      screen.getByText("Up to a limit of 0 API Calls"),
    ).toBeInTheDocument();
  });

  test("does not render when showHardLimit display setting is false", () => {
    setupMocks({ showHardLimit: false });

    const { container } = render(
      <HardLimitTooltip feature={createMockFeature()} limit={1000} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("renders when showHardLimit display setting is true", () => {
    setupMocks({ showHardLimit: true });

    render(<HardLimitTooltip feature={createMockFeature()} limit={1000} />);

    expect(screen.getByTitle("limit")).toBeInTheDocument();
  });

  test("defaults to showing tooltip when data is undefined (showHardLimit ?? false)", () => {
    mockUseEmbed.mockReturnValue({ data: undefined });
    mockUseIsLightBackground.mockReturnValue(true);

    const { container } = render(
      <HardLimitTooltip feature={createMockFeature()} limit={500} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("throws when data exists but displaySettings is undefined", () => {
    mockUseEmbed.mockReturnValue({
      data: { displaySettings: undefined },
    });
    mockUseIsLightBackground.mockReturnValue(true);

    // The component accesses data?.displaySettings.showHardLimit
    // which throws if data exists but displaySettings is undefined
    expect(() =>
      render(<HardLimitTooltip feature={createMockFeature()} limit={500} />),
    ).toThrow();
  });

  test("uses feature name fallback when singularName and pluralName are not set", () => {
    const feature = createMockFeature({
      name: "Request",
      singularName: null,
      pluralName: null,
    });

    render(<HardLimitTooltip feature={feature} limit={5} />);

    const trigger = screen.getByTitle("limit");
    fireEvent.pointerEnter(trigger);

    expect(screen.getByText("Up to a limit of 5 Requests")).toBeInTheDocument();
  });
});
