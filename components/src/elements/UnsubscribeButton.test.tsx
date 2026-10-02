import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import {
  UnsubscribeButton,
  type UnsubscribeButtonProps,
} from "./UnsubscribeButton";
import { company, companySubscription } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderButton(
  data: BillingData = SCENARIOS.planManager(),
  props: UnsubscribeButtonProps = {},
  unsubscribe: () => Promise<void> = async () => {},
) {
  return render(
    <BillingDataProvider actions={{ unsubscribe }} data={data}>
      <UnsubscribeButton locale={L} {...props} />
    </BillingDataProvider>,
  );
}

describe("UnsubscribeButton", () => {
  test("renders nothing before the company loads", () => {
    const { container } = renderButton({});
    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing without a subscription to cancel", () => {
    const { container } = renderButton({
      ...SCENARIOS.planManager(),
      company: company({
        subscription: companySubscription({
          cancelAt: new Date("2026-10-01T12:00:00Z"),
          cancelAtPeriodEnd: true,
        }),
      }),
    });
    expect(container).toBeEmptyDOMElement();
  });

  test("confirms with when access ends and what the subscription costs", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    const dialog = screen.getByRole("dialog", { name: "Cancel subscription" });
    expect(dialog).toHaveTextContent(
      "You will retain access to your plan until the end of the billing period, on",
    );
    expect(dialog).toHaveTextContent("Pro$29.00/mo");
    expect(dialog).toHaveTextContent("Extra seats$10.00/mo");
    expect(dialog).toHaveTextContent("Onboarding$500.00");
    // 2900 + 1000 + the seats paid in advance, 18000.
    expect(dialog).toHaveTextContent("Monthly total:$219.00/mo");
    expect(screen.queryByText("Not ready to cancel?")).toBeNull();
  });

  test("offers Manage plan when the host gives it somewhere to go", () => {
    renderButton(SCENARIOS.planManager(), { managePlanUrl: "/plans" });
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    expect(screen.getByText("Not ready to cancel?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage plan" })).toHaveAttribute(
      "href",
      "/plans",
    );
  });

  test("cancels, closes, and tells the host", async () => {
    const unsubscribe = vi.fn(async () => {});
    const onUnsubscribed = vi.fn();
    renderButton(SCENARIOS.planManager(), { onUnsubscribed }, unsubscribe);
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel subscription" }),
    );
    await waitFor(() => expect(onUnsubscribed).toHaveBeenCalledOnce());
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("says the cancellation failed and stays open", async () => {
    renderButton(SCENARIOS.planManager(), {}, async () => {
      throw new Error("company has no active subscriptions");
    });
    fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Cancel subscription" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unsubscribe failed",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
