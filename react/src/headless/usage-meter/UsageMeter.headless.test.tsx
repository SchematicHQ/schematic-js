import { render } from "@testing-library/react";
import { vi } from "vitest";

import { UsageMeter, useUsageMeterContext } from "./index";

import { type UsageMeterData } from "@schematichq/schematic-react";

const { mockUseUsageMeter } = vi.hoisted(() => ({
  mockUseUsageMeter: vi.fn(),
}));

// `UsageMeter.Root` reads its data from the core `useUsageMeter` hook via the
// package self-specifier (externalized in the real bundle). Stub just that hook
// so these tests exercise the headless shell in isolation.
vi.mock("@schematichq/schematic-react", async (importActual) => {
  const actual =
    await importActual<typeof import("@schematichq/schematic-react")>();
  return { ...actual, useUsageMeter: mockUseUsageMeter };
});

function setData(data: UsageMeterData) {
  mockUseUsageMeter.mockReturnValue(data);
}

const withData: UsageMeterData = {
  flag: "seats",
  usage: 42,
  allocation: 100,
  percent: 42,
  hasData: true,
};

describe("UsageMeter headless", () => {
  beforeEach(() => mockUseUsageMeter.mockReset());

  it("renders Track as a meter with aria range and part attributes", () => {
    setData(withData);
    const { getByRole } = render(
      <UsageMeter.Root flag="seats">
        <UsageMeter.Track>
          <UsageMeter.Fill />
        </UsageMeter.Track>
      </UsageMeter.Root>,
    );

    const track = getByRole("meter");
    expect(track.getAttribute("data-schematic-part")).toBe("track");
    expect(track.getAttribute("aria-valuenow")).toBe("42");
    expect(track.getAttribute("aria-valuemin")).toBe("0");
    expect(track.getAttribute("aria-valuemax")).toBe("100");
    expect(track.getAttribute("data-percent")).toBe("42");
  });

  it("exposes percent on Fill as a CSS custom property", () => {
    setData(withData);
    const { container } = render(
      <UsageMeter.Root flag="seats">
        <UsageMeter.Fill />
      </UsageMeter.Root>,
    );

    const fill = container.querySelector('[data-schematic-part="fill"]')!;
    expect(fill).not.toBeNull();
    expect(
      (fill as HTMLElement).style.getPropertyValue(
        "--schematic-usage-meter-percent",
      ),
    ).toBe("42");
  });

  it("hands derived numbers to the Value render prop", () => {
    setData(withData);
    const { getByText } = render(
      <UsageMeter.Root flag="seats">
        <UsageMeter.Value>
          {({ usage, allocation }) => (
            <span>
              {usage} / {allocation}
            </span>
          )}
        </UsageMeter.Value>
      </UsageMeter.Root>,
    );

    expect(getByText("42 / 100")).toBeInTheDocument();
  });

  it("projects Track behavior onto a custom element via asChild", () => {
    setData(withData);
    const { getByRole } = render(
      <UsageMeter.Root flag="seats">
        <UsageMeter.Track asChild>
          <section data-testid="custom" />
        </UsageMeter.Track>
      </UsageMeter.Root>,
    );

    const el = getByRole("meter");
    expect(el.tagName).toBe("SECTION");
    expect(el.getAttribute("data-schematic-part")).toBe("track");
  });

  it("renders Empty only when there is no usage data", () => {
    setData({
      flag: "seats",
      usage: undefined,
      allocation: undefined,
      percent: 0,
      hasData: false,
    });
    const { getByText, queryByRole } = render(
      <UsageMeter.Root flag="seats">
        <UsageMeter.Empty>No limit</UsageMeter.Empty>
        <UsageMeter.Track />
      </UsageMeter.Root>,
    );

    expect(getByText("No limit")).toBeInTheDocument();
    // Track still renders structurally; Empty is the consumer's fallback hook
    expect(queryByRole("meter")).toBeInTheDocument();
  });

  it("useUsageMeterContext throws outside a Root", () => {
    function Orphan() {
      useUsageMeterContext();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      "`useUsageMeterContext` must be rendered inside `UsageMeter.Root`.",
    );
  });
});
