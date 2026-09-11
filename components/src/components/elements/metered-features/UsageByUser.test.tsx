import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { UsageByUser } from "./UsageByUser";

const state = vi.hoisted(() => ({
  getCreditUsageByUser: vi.fn(),
  getFeatureUsageByUser: vi.fn(),
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      settings: defaultSettings,
      getCreditUsageByUser: state.getCreditUsageByUser,
      getFeatureUsageByUser: state.getFeatureUsageByUser,
    }),
    useIsLightBackground: () => true,
  };
});

const TOKENS = { name: "token", singularName: "token", pluralName: "tokens" };

const entry = (id: string, name: string, creditsUsed: number) => ({
  userId: id,
  user: { id, name },
  creditsUsed,
});

// `totalUsers` counts attributed users only — the API excludes the
// unattributed rollup from it.
const creditResponse = (
  entries: ReturnType<typeof entry>[],
  unattributed?: number,
) => ({
  data: {
    entries,
    total: entries.reduce((sum, e) => sum + e.creditsUsed, 0),
    totalUsers: entries.length,
    unattributed:
      typeof unattributed === "number" ? { creditsUsed: unattributed } : null,
  },
});

const renderCredit = () =>
  render(
    <UsageByUser
      source={{ kind: "credit", id: "token-credit" }}
      unit={TOKENS}
    />,
  );

beforeEach(() => {
  state.getCreditUsageByUser.mockReset();
  state.getFeatureUsageByUser.mockReset();
  state.getFeatureUsageByUser.mockResolvedValue(undefined);
});

describe("UsageByUser", () => {
  // The unattributed row only renders once expanded, so it has to be reachable
  // even when there are too few named users to overflow the collapsed list.
  test("reveals the unattributed rollup with fewer than four named users", async () => {
    state.getCreditUsageByUser.mockResolvedValue(
      creditResponse([entry("u1", "ana@example.com", 30)], 12),
    );
    renderCredit();

    await screen.findByText("ana@example.com");
    expect(screen.queryByText("Unattributed")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByText("Show all"));

    expect(screen.getByText("Unattributed")).toBeInTheDocument();
    expect(screen.getByText("12 tokens")).toBeInTheDocument();
  });

  // Usage that is entirely unattributed used to render a heading with no rows
  // and no way to expand.
  test("reveals the rollup when all usage is unattributed", async () => {
    state.getCreditUsageByUser.mockResolvedValue(creditResponse([], 40));
    renderCredit();

    fireEvent.click(await screen.findByText("Show all"));

    expect(screen.getByText("Unattributed")).toBeInTheDocument();
    expect(screen.getByText("40 tokens")).toBeInTheDocument();
  });

  // The expanded list is capped, so the toggle promises the top N rather than
  // claiming to show everyone.
  test("offers the top N when the period has more users than the list can render", async () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry(`u${i}`, `user${i}@example.com`, 100 - i),
    );
    const response = creditResponse(entries);
    state.getCreditUsageByUser.mockResolvedValue({
      ...response,
      data: { ...response.data, totalUsers: 25 },
    });
    renderCredit();

    fireEvent.click(await screen.findByText("Show top 20 users"));

    expect(screen.getByText("plus 5 more")).toBeInTheDocument();
  });

  test("counts every user when the expanded list can reach them all", async () => {
    const entries = Array.from({ length: 4 }, (_, i) =>
      entry(`u${i}`, `user${i}@example.com`, 100 - i),
    );
    state.getCreditUsageByUser.mockResolvedValue(creditResponse(entries));
    renderCredit();

    expect(await screen.findByText("Show all 4 users")).toBeInTheDocument();
  });

  // Amounts are denominated in the section's unit, pluralized against their own
  // value — a fixed plural reads "1 tokens".
  test("pluralizes each amount against its own value", async () => {
    state.getCreditUsageByUser.mockResolvedValue(
      creditResponse([
        entry("u1", "ana@example.com", 1),
        entry("u2", "bo@example.com", 2),
      ]),
    );
    renderCredit();

    expect(await screen.findByText("1 token")).toBeInTheDocument();
    expect(screen.getByText("2 tokens")).toBeInTheDocument();
    expect(
      screen.getByText("3 tokens used by your team this period"),
    ).toBeInTheDocument();
  });

  // Features come back on a different endpoint with a different row shape.
  test("renders the feature breakdown from the feature endpoint", async () => {
    state.getFeatureUsageByUser.mockResolvedValue({
      data: {
        rows: [
          {
            userId: "u1",
            user: { id: "u1", name: "ana@example.com" },
            value: 7,
          },
        ],
        total: 9,
        totalUsers: 1,
        unattributed: { value: 2 },
      },
    });

    render(
      <UsageByUser
        source={{ kind: "feature", id: "api-requests" }}
        unit={{ name: "request" }}
      />,
    );

    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("7 requests")).toBeInTheDocument();
    expect(
      screen.getByText("9 requests used by your team this period"),
    ).toBeInTheDocument();
    expect(state.getCreditUsageByUser).not.toHaveBeenCalled();
  });

  test("reports a failed fetch and recovers on retry", async () => {
    state.getCreditUsageByUser.mockRejectedValueOnce(new Error("boom"));
    renderCredit();

    expect(
      await screen.findByText("There was a problem retrieving usage by user."),
    ).toBeInTheDocument();

    state.getCreditUsageByUser.mockResolvedValue(
      creditResponse([entry("u1", "ana@example.com", 30)]),
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(
      screen.queryByText("There was a problem retrieving usage by user."),
    ).not.toBeInTheDocument();
  });

  test("renders nothing when there is no usage to attribute", async () => {
    state.getCreditUsageByUser.mockResolvedValue(creditResponse([]));
    const { container } = renderCredit();

    await waitFor(() => expect(state.getCreditUsageByUser).toHaveBeenCalled());
    expect(screen.queryByText("Usage by user")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  // The toggle is the shared `ExpandListToggle`, so it is reachable without a
  // pointer.
  test("expands from the keyboard", async () => {
    state.getCreditUsageByUser.mockResolvedValue(
      creditResponse([entry("u1", "ana@example.com", 30)], 12),
    );
    renderCredit();

    const toggle = await screen.findByRole("button", { name: /Show all/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(toggle, { key: "Enter" });

    expect(screen.getByText("Unattributed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show fewer/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
