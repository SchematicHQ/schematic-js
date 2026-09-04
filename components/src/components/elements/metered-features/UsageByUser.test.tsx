import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { UsageByUser } from "./UsageByUser";

const state = vi.hoisted(() => ({
  getCreditUsageByUser: vi.fn(),
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      settings: defaultSettings,
      getCreditUsageByUser: state.getCreditUsageByUser,
      getFeatureUsageByUser: vi.fn(() => Promise.resolve(undefined)),
    }),
    useIsLightBackground: () => true,
  };
});

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
      unit="tokens"
    />,
  );

beforeEach(() => {
  state.getCreditUsageByUser.mockReset();
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

  // The toggle promises what expanding actually shows, not every user in the
  // period: the expanded list is capped.
  test("counts only the users the expanded list can render", async () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry(`u${i}`, `user${i}@example.com`, 100 - i),
    );
    state.getCreditUsageByUser.mockResolvedValue({
      ...creditResponse(entries),
      data: { ...creditResponse(entries).data, totalUsers: 25 },
    });
    renderCredit();

    expect(await screen.findByText("Show all 20 users")).toBeInTheDocument();
  });

  test("reports a failed fetch instead of rejecting", async () => {
    state.getCreditUsageByUser.mockRejectedValue(new Error("boom"));
    renderCredit();

    expect(
      await screen.findByText("Unable to load usage by user."),
    ).toBeInTheDocument();
  });

  test("renders nothing when there is no usage to attribute", async () => {
    state.getCreditUsageByUser.mockResolvedValue(creditResponse([]));
    const { container } = renderCredit();

    await waitFor(() => expect(state.getCreditUsageByUser).toHaveBeenCalled());
    expect(screen.queryByText("Usage by user")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
