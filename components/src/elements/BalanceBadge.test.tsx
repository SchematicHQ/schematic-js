import {
  BillingDataProvider,
  SchematicProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { BalanceBadge, type BalanceBadgeProps } from "./BalanceBadge";
import { NOW, creditBalance, daysFromNow } from "./fixtures/builders";
import { fakeStreamClient, streamSpendPolicy } from "./fixtures/stream";

const L = "en-US";

const ai = (overrides: Parameters<typeof creditBalance>[0] = {}) =>
  creditBalance({
    creditId: "bcr_ai",
    remaining: 2450,
    total: 5000,
    ...overrides,
  });

function renderBadge(
  props: BalanceBadgeProps = {},
  {
    data = { creditBalances: [ai()] },
    stream = fakeStreamClient(),
    status,
  }: {
    data?: BillingData;
    stream?: ReturnType<typeof fakeStreamClient>;
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
  } = {},
) {
  const view = render(
    <SchematicProvider client={stream.client}>
      <BillingDataProvider data={data} status={status}>
        <BalanceBadge locale={L} {...props} />
      </BillingDataProvider>
    </SchematicProvider>,
  );
  return { ...view, stream };
}

const pill = (container: HTMLElement) =>
  container.querySelector(".schematic-balance-badge__pill");
const root = (container: HTMLElement) =>
  container.querySelector(".schematic-balance-badge");
const tooltip = () => screen.getByRole("tooltip");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

test("shows the balance, a meter of the share used, and the reset", () => {
  const { container } = renderBadge();
  expect(pill(container)).toHaveTextContent("2,450 AI credits");
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "51");
  expect(pill(container)).toHaveTextContent("Resets Aug 31");
  expect(root(container)).toHaveAttribute("data-tone", "ok");
  expect(tooltip()).toHaveTextContent(/^2,450 of 5,000 AI credits left\./);
});

test("describes the pill with the tooltip", () => {
  const { container } = renderBadge();
  expect(pill(container)).toHaveAttribute("aria-describedby", tooltip().id);
  expect(pill(container)).toHaveAttribute("tabindex", "0");
});

test("holds a pill-shaped skeleton while balances load", () => {
  const { container } = renderBadge({}, { data: {} });
  expect(root(container)).toHaveAttribute("data-state", "pending");
  expect(screen.getByText("Loading credit balance")).toBeInTheDocument();
});

test("renders nothing on an error", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const { container } = renderBadge(
    {},
    { data: {}, status: { creditBalances: { error: new Error("boom") } } },
  );
  expect(container).toBeEmptyDOMElement();
});

test("renders nothing for several credits without a creditId", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { container } = renderBadge(
    {},
    { data: { creditBalances: [ai(), creditBalance()] } },
  );
  expect(container).toBeEmptyDOMElement();
  expect(warn).toHaveBeenCalledWith(expect.stringContaining("creditId"));
});

test("shows the named credit among several", () => {
  const { container } = renderBadge(
    { creditId: "bcr_ai" },
    { data: { creditBalances: [creditBalance(), ai()] } },
  );
  expect(pill(container)).toHaveTextContent("2,450 AI credits");
});

test("renders nothing without a credit", () => {
  const { container } = renderBadge({}, { data: { creditBalances: [] } });
  expect(container).toBeEmptyDOMElement();
});

test("follows the live balance once the stream has one", () => {
  const { container, stream } = renderBadge();
  act(() => {
    stream.emitBalances({
      bcr_ai: { remaining: 400, reserved: 0, settled: 400 },
    });
  });
  expect(pill(container)).toHaveTextContent("400 AI credits");
  expect(root(container)).toHaveAttribute("data-tone", "warning");
});

test("turns amber on a tighter cap and counts down to its reset", () => {
  const stream = fakeStreamClient({ policies: [streamSpendPolicy()] });
  const { container } = renderBadge({}, { stream });
  expect(root(container)).toHaveAttribute("data-tone", "warning");
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "88");
  expect(pill(container)).toHaveTextContent("2,450 AI credits");
  expect(pill(container)).toHaveTextContent("Resets in 6h");
  expect(tooltip()).toHaveTextContent(
    "Your daily limit: 44 of 50 used. Resets",
  );
});

test("says which limit blocks and when it unlocks", () => {
  const policy = streamSpendPolicy({ consumed: 50 });
  const stream = fakeStreamClient({ policies: [policy] });
  const { container } = renderBadge({}, { stream });
  const time = policy.resetsAt!.toLocaleTimeString(L, {
    hour: "numeric",
    minute: "2-digit",
  });
  expect(root(container)).toHaveAttribute("data-tone", "blocked");
  expect(pill(container)).toHaveTextContent("Daily limit reached");
  expect(pill(container)).toHaveTextContent(`Unlocks ${time}`);
  expect(tooltip()).toHaveTextContent("2,450 of 5,000 AI credits left.");
});

test("says the credit ran out and when it comes back", () => {
  const { container } = renderBadge(
    {},
    { data: { creditBalances: [ai({ remaining: 0 })] } },
  );
  expect(pill(container)).toHaveTextContent("Out of AI credits");
  expect(pill(container)).toHaveTextContent("Unlocks Aug 31");
});

test("leaves the date off a balance that never resets", () => {
  const { container } = renderBadge(
    {},
    { data: { creditBalances: [ai({ remaining: 0, resetsAt: undefined })] } },
  );
  expect(pill(container)).toHaveTextContent(/^Out of AI credits$/);
});

test("names the team's limits and the per-use cap in the tooltip", () => {
  const stream = fakeStreamClient({
    policies: [
      streamSpendPolicy({
        consumed: 100,
        limit: 400,
        resetsAt: daysFromNow(10),
        scope: "company",
        window: { count: 1, unit: "billing_period" },
      }),
      streamSpendPolicy({ kind: "per_draw", limit: 25, window: undefined }),
    ],
  });
  renderBadge({}, { stream });
  expect(tooltip()).toHaveTextContent(
    "Your team's monthly limit: 100 of 400 used.",
  );
  expect(tooltip()).toHaveTextContent("Up to 25 AI credits per use.");
});

test("links with href and calls onClick", () => {
  const { container, unmount } = renderBadge({ href: "/billing" });
  expect(pill(container)).toHaveAttribute("href", "/billing");
  unmount();

  const onClick = vi.fn();
  renderBadge({ href: "/billing", onClick });
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("hides the meter and the reset", () => {
  const { container } = renderBadge({ showMeter: false, showReset: false });
  expect(screen.queryByRole("meter")).toBeNull();
  expect(pill(container)).toHaveTextContent(/^2,450 AI credits$/);
});

test("needs a SchematicProvider", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() =>
    render(
      <BillingDataProvider data={{ creditBalances: [ai()] }}>
        <BalanceBadge />
      </BillingDataProvider>,
    ),
  ).toThrow(/SchematicProvider/);
});

test("declares what it reads", () => {
  expect(BalanceBadge.resources).toEqual(["creditBalances"]);
});
