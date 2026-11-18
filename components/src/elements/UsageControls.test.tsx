import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingActions,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { UsageControls, type UsageControlsProps } from "./UsageControls";
import { NOW, creditBalance } from "./fixtures/builders";
import { SCENARIOS, usageControlsUsers } from "./fixtures/scenarios";

const L = "en-US";

function renderControls(
  props: UsageControlsProps = {},
  {
    actions,
    data = SCENARIOS.usageControls(),
    status,
  }: {
    actions?: Partial<BillingActions>;
    data?: BillingData;
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
  } = {},
) {
  return render(
    <BillingDataProvider
      actions={actions}
      creditUserUsage={usageControlsUsers()}
      data={data}
      status={status}
    >
      <UsageControls locale={L} {...props} />
    </BillingDataProvider>,
  );
}

const rows = () => screen.queryAllByTestId("schematic-usage-control");
const row = (text: string) => {
  const found = rows().find((r) => r.textContent?.includes(text));
  if (found === undefined) throw new Error(`no row with ${text}`);
  return found;
};
/** The scenario without its limits, so a status override is all the element sees. */
const unloaded = (): BillingData => {
  const { spendPolicies: _, ...rest } = SCENARIOS.usageControls();
  return rest;
};

/** A UTC instant as the row prints a date, in whatever zone the suite runs. */
const day = (iso: string) =>
  new Date(iso).toLocaleDateString(L, { day: "numeric", month: "short" });

const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const pick = (name: string) =>
  fireEvent.click(within(dialog()).getByRole("button", { name }));

describe("UsageControls", () => {
  test("lists each limit with its cap and reset, usage only in its chip", () => {
    renderControls();
    expect(rows()).toHaveLength(4);
    expect(rows()[0]).toHaveTextContent("Everyone at Acme");
    expect(rows()[0]).toHaveTextContent("10,000 AI credits per billing period");
    expect(rows()[0]).toHaveTextContent(
      `Resets ${day("2026-08-31T12:00:00Z")}`,
    );
    expect(row("Ada")).toHaveTextContent("50 AI credits per day");
    expect(row("Cy")).toHaveTextContent("25 AI credits per use");
    expect(screen.queryByRole("meter")).toBeNull();
    expect(rows()[0]).not.toHaveTextContent("3,200");
    expect(
      document.querySelector(".schematic-usage-controls__credit-name"),
    ).toHaveTextContent("AI credits");
  });

  test("flags a limit near or at its cap", () => {
    renderControls();
    expect(row("Ada")).toHaveTextContent("Near limit · 42 of 50");
    expect(row("Bo")).toHaveTextContent("Limit reached · 200 of 200");
    // Beside the name, not with the row's actions.
    expect(
      row("Ada").querySelector(
        ".schematic-usage-controls__what .schematic-usage-controls__status",
      ),
    ).toHaveTextContent("Near limit · 42 of 50");
    expect(rows()[0]).not.toHaveTextContent("Near limit");
  });

  test("is read-only unless the host allows editing", () => {
    renderControls();
    expect(screen.queryByRole("button", { name: "Add a policy" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit limit/ })).toBeNull();
    expect(
      document.querySelector(".schematic-usage-controls__footer"),
    ).toBeNull();
  });

  test("puts Add a policy after the list, not in the header", () => {
    renderControls({ allowEdit: true });
    const add = screen.getByRole("button", { name: "Add a policy" });
    expect(document.querySelector(".schematic-header")).not.toContainElement(
      add,
    );
    const list = document.querySelector(".schematic-usage-controls__list");
    expect(
      list!.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("says everyone shares the balance when nothing is capped", () => {
    renderControls(
      { allowEdit: true },
      { data: { ...SCENARIOS.usageControls(), spendPolicies: [] } },
    );
    expect(screen.getByText("No usage controls")).toBeInTheDocument();
    expect(
      screen.getByText("Everyone shares the company balance."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add a policy" }),
    ).toBeInTheDocument();
  });

  test("renders nothing with no credits and no limits", () => {
    const { container } = renderControls(
      {},
      {
        data: {
          ...SCENARIOS.usageControls(),
          creditBalances: [],
          spendPolicies: [],
        },
      },
    );
    expect(container).toBeEmptyDOMElement();
  });

  test.each([403, 404])(
    "renders nothing when spend policies are off (%i)",
    (status) => {
      const { container } = renderControls(
        {},
        {
          data: unloaded(),
          status: {
            spendPolicies: {
              error: new SchematicApiError(
                status,
                "/company/credits/spend-policies",
                "not found",
              ),
            },
          },
        },
      );
      expect(container).toBeEmptyDOMElement();
    },
  );

  test("shows the shared error with a retry on any other failure", () => {
    renderControls(
      {},
      {
        data: unloaded(),
        status: { spendPolicies: { error: new Error("boom") } },
      },
    );
    expect(
      screen.getByText("There was a problem retrieving usage controls."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("shows skeleton rows while loading", () => {
    renderControls(
      {},
      { data: unloaded(), status: { spendPolicies: { isPending: true } } },
    );
    expect(rows()).toHaveLength(0);
    expect(document.querySelectorAll(".schematic-skeleton__row")).toHaveLength(
      3,
    );
  });

  test("names the credit on each row when limits span several", () => {
    const data = SCENARIOS.usageControls();
    renderControls(
      {},
      {
        data: {
          ...data,
          creditBalances: [
            ...(data.creditBalances ?? []),
            creditBalance({ creditId: "bcr_x", creditName: "Export credit" }),
          ],
        },
      },
    );
    expect(row("Ada")).toHaveTextContent("Ada · AI credits");
    expect(
      document.querySelector(".schematic-usage-controls__credit-name"),
    ).toBeNull();
  });

  describe("adding", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("a company cap, with Monthly as the plan period", async () => {
      const createSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { createSpendPolicy } });
      fireEvent.click(screen.getByRole("button", { name: "Add a policy" }));
      expect(dialog()).toHaveTextContent("Add a policy");

      // The company already has a plan-period cap, so Monthly is taken.
      expect(
        within(dialog()).getByRole("button", { name: "Monthly" }),
      ).toBeDisabled();
      pick("Weekly");
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "1500" },
      });
      expect(dialog()).toHaveTextContent(
        /Up to 1,500 AI credits a week, resets /,
      );
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(createSpendPolicy).toHaveBeenCalledWith({
          creditId: "bcr_ai",
          windowAmount: 1500,
          windowUnit: "week",
        }),
      );
      await vi.waitFor(() =>
        expect(document.querySelector("dialog")).toBeNull(),
      );
    });

    test("a person's cap, offering only periods they lack", async () => {
      const createSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { createSpendPolicy } });
      fireEvent.click(screen.getByRole("button", { name: "Add a policy" }));
      pick("One person");
      expect(
        within(dialog()).getByRole("button", { name: "Monthly" }),
      ).toBeEnabled();
      fireEvent.change(within(dialog()).getByLabelText("Person"), {
        target: { value: "user_ada" },
      });
      expect(
        within(dialog()).getByRole("button", { name: "Daily" }),
      ).toBeDisabled();
      pick("Monthly");
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "300" },
      });
      expect(dialog()).toHaveTextContent(
        `Up to 300 AI credits a month, resets ${day("2026-09-01T00:00:00Z")}`,
      );
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(createSpendPolicy).toHaveBeenCalledWith({
          creditId: "bcr_ai",
          userId: "user_ada",
          windowAmount: 300,
          windowUnit: "month",
        }),
      );
    });

    test("a per-use cap", async () => {
      const createSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { createSpendPolicy } });
      fireEvent.click(screen.getByRole("button", { name: "Add a policy" }));
      pick("Per use");
      expect(within(dialog()).queryByText("Period")).toBeNull();
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "10" },
      });
      expect(dialog()).toHaveTextContent("Up to 10 AI credits on any one use");
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(createSpendPolicy).toHaveBeenCalledWith({
          creditId: "bcr_ai",
          maxPerDraw: 10,
        }),
      );
    });

    test("waits for an amount and a person before saving", () => {
      renderControls({ allowEdit: true });
      fireEvent.click(screen.getByRole("button", { name: "Add a policy" }));
      const save = within(dialog()).getByRole("button", { name: "Save" });
      expect(save).toBeDisabled();
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "5" },
      });
      expect(save).toBeEnabled();
      pick("One person");
      expect(save).toBeDisabled();
    });

    test("keeps the dialog open and explains a duplicate", async () => {
      const createSpendPolicy = vi.fn(async () => {
        throw new SchematicApiError(
          409,
          "/company/credits/spend-policies",
          "exists",
        );
      });
      renderControls({ allowEdit: true }, { actions: { createSpendPolicy } });
      fireEvent.click(screen.getByRole("button", { name: "Add a policy" }));
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "5" },
      });
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      expect(await within(dialog()).findByRole("alert")).toHaveTextContent(
        "There is already a limit for that period. Edit that one instead.",
      );
    });
  });

  describe("editing", () => {
    test("changes the amount and leaves the period alone", async () => {
      const updateSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { updateSpendPolicy } });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit limit for Ada: 50 AI credits per day",
        }),
      );
      expect(dialog()).toHaveTextContent("Edit policy");
      expect(within(dialog()).queryByText("Applies to")).toBeNull();
      expect(dialog()).toHaveTextContent("AI credits · Per period");
      fireEvent.change(within(dialog()).getByLabelText("Credits"), {
        target: { value: "60" },
      });
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(updateSpendPolicy).toHaveBeenCalledWith("csp_ada", {
          windowAmount: 60,
        }),
      );
    });

    test("moves the window when the period changes", async () => {
      const updateSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { updateSpendPolicy } });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit limit for Ada: 50 AI credits per day",
        }),
      );
      pick("Weekly");
      fireEvent.click(within(dialog()).getByRole("button", { name: "Save" }));
      await vi.waitFor(() =>
        expect(updateSpendPolicy).toHaveBeenCalledWith("csp_ada", {
          windowAmount: 50,
          windowUnit: "week",
        }),
      );
    });

    test("removes after an inline confirm", async () => {
      const removeSpendPolicy = vi.fn(async () => {});
      renderControls({ allowEdit: true }, { actions: { removeSpendPolicy } });
      fireEvent.click(
        screen.getByRole("button", {
          name: "Edit limit for Cy: 25 AI credits per use",
        }),
      );
      fireEvent.click(within(dialog()).getByRole("button", { name: "Remove" }));
      expect(dialog()).toHaveTextContent("Remove this limit?");
      expect(
        within(dialog()).queryByRole("button", { name: "Save" }),
      ).toBeNull();
      // The pair takes Cancel and Save's place: Keep, then Remove last.
      const end = dialog().querySelector(
        ".schematic-usage-controls__actions-end",
      ) as HTMLElement;
      expect(
        within(end)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Keep", "Remove"]);
      pick("Keep");
      expect(removeSpendPolicy).not.toHaveBeenCalled();
      fireEvent.click(within(dialog()).getByRole("button", { name: "Remove" }));
      pick("Remove");
      await vi.waitFor(() =>
        expect(removeSpendPolicy).toHaveBeenCalledWith("csp_cy"),
      );
    });
  });
});
