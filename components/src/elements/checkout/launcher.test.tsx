import { BillingDataProvider } from "@schematichq/schematic-react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { cardPaymentMethod } from "../fixtures/builders";
import { catalog, catalogPlan, companyOn } from "../fixtures/checkout";

import { CheckoutLauncherProvider, useCheckoutLauncher } from "./launcher";

const starter = catalogPlan({ current: true, name: "Starter" });
const pro = catalogPlan({ name: "Pro" });
const data = {
  catalog: catalog({ plans: [starter, pro] }),
  company: companyOn(starter),
  featureUsage: [],
  paymentMethods: [cardPaymentMethod({ isDefault: true })],
};

function Upgrade({ planId }: { planId?: string }) {
  const { isOpen, open } = useCheckoutLauncher();
  return (
    <button
      data-open={isOpen}
      type="button"
      onClick={() =>
        open(planId === undefined ? undefined : { selection: { planId } })
      }
    >
      Upgrade
    </button>
  );
}

const selectedPlan = () =>
  document.querySelector(
    '[data-selected="true"] .schematic-checkout__card-name',
  )?.textContent;

describe("CheckoutLauncherProvider", () => {
  test("opens the checkout on the config, over the defaults", () => {
    render(
      <BillingDataProvider data={data}>
        <CheckoutLauncherProvider
          defaults={{ steps: { hideSkipped: true } }}
          locale="en-US"
        >
          <Upgrade planId={pro.id} />
        </CheckoutLauncherProvider>
      </BillingDataProvider>,
    );
    expect(document.querySelector("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Upgrade"));
    expect(document.querySelector("dialog")).not.toBeNull();
    expect(selectedPlan()).toBe("Pro");
    expect(screen.getByText("Upgrade")).toHaveAttribute("data-open", "true");
  });

  test("starts a new cart on every open", () => {
    render(
      <BillingDataProvider data={data}>
        <CheckoutLauncherProvider locale="en-US">
          <Upgrade planId={pro.id} />
        </CheckoutLauncherProvider>
      </BillingDataProvider>,
    );
    fireEvent.click(screen.getByText("Upgrade"));
    fireEvent.click(screen.getAllByRole("button", { name: "Select" })[0]);
    expect(selectedPlan()).toBe("Starter");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.querySelector("dialog")).toBeNull();
    fireEvent.click(screen.getByText("Upgrade"));
    expect(selectedPlan()).toBe("Pro");
  });

  test("does nothing outside a provider, and says so", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Upgrade />);
    fireEvent.click(screen.getByText("Upgrade"));
    expect(document.querySelector("dialog")).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("CheckoutLauncherProvider"),
    );
    error.mockRestore();
  });
});
