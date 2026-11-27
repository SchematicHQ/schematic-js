import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { CreditBundles, type CreditBundlesProps } from "./CreditBundles";
import { CheckoutLauncherProvider } from "./checkout/launcher";
import { cardPaymentMethod } from "./fixtures/builders";
import { catalog, creditBundle } from "./fixtures/checkout";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderBundles(
  data: BillingData = SCENARIOS.creditBundles(),
  props: CreditBundlesProps = {},
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
) {
  return render(
    <BillingDataProvider data={data} status={status}>
      <CreditBundles locale={L} {...props} />
    </BillingDataProvider>,
  );
}

const rows = () => screen.queryAllByTestId("schematic-credit-bundle");

describe("CreditBundles", () => {
  test("lists the bundles the plan can buy", () => {
    renderBundles();
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent("Booster");
    expect(rows()[0]).toHaveTextContent("500 AI credits · Never expire");
    expect(rows()[0].textContent).toContain(
      "500 AI credits\u00a0· Never expire",
    );
    expect(rows()[1]).toHaveTextContent(
      "2,000 AI credits · Expire after 90 days",
    );
    expect(
      within(rows()[0]).getByRole("button", {
        name: "Buy Booster for $10.00",
      }),
    ).toHaveTextContent(/^\$10\.00$/);
    expect(screen.queryByText("Scale")).toBeNull();
  });

  test("names each row's credit when bundles span several", () => {
    const data = SCENARIOS.creditBundles();
    const held = data.catalog as ReturnType<typeof catalog>;
    renderBundles({
      ...data,
      catalog: {
        ...held,
        creditBundles: [
          ...held.creditBundles,
          creditBundle({
            creditId: "bcr_export",
            creditPluralName: "Export credits",
            name: "Exports",
            quantity: 50,
          }),
        ],
      },
    });
    expect(rows()[0]).toHaveTextContent("AI credits");
    expect(rows()[2]).toHaveTextContent("50 Export credits");
  });

  test("narrows to the credits asked for", () => {
    renderBundles(undefined, { credits: ["bcr_other"] });
    expect(rows()).toHaveLength(0);
    expect(
      screen.getByText("No credit bundles for your plan"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contact your account team to add credits."),
    ).toBeInTheDocument();
  });

  test("hands the bundle to onBuy", () => {
    const onBuy = vi.fn();
    renderBundles(undefined, { onBuy });
    fireEvent.click(screen.getByRole("button", { name: /^Buy Growth/ }));
    expect(onBuy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "bcb_growth" }),
    );
  });

  test("opens checkout on the credits step with the bundle staged", () => {
    const data = {
      ...SCENARIOS.creditBundles(),
      featureUsage: [],
      paymentMethods: [cardPaymentMethod({ isDefault: true })],
    };
    render(
      <BillingDataProvider data={data}>
        <CheckoutLauncherProvider locale={L}>
          <CreditBundles locale={L} />
        </CheckoutLauncherProvider>
      </BillingDataProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Buy Booster for $10.00" }),
    );
    const dialog = document.querySelector("dialog") as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector('[data-step="credits"]')).not.toBeNull();
    const steps = [...dialog.querySelectorAll(".schematic-checkout__step")].map(
      (step) => step.textContent,
    );
    expect(steps).toEqual(["Credits", "Checkout"]);
    const booster = within(dialog)
      .getAllByTestId("schematic-checkout-bundle")
      .find((row) => row.textContent?.includes("Booster")) as HTMLElement;
    expect(booster.querySelector("input")).toHaveValue(1);
  });

  test("waits for the catalog", () => {
    renderBundles({}, {}, { catalog: { isPending: true } });
    expect(
      screen.getByText("Loading credit bundles").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("waits for the company before judging what the plan can buy", () => {
    const { catalog: held } = SCENARIOS.creditBundles();
    renderBundles({ catalog: held });
    expect(rows()).toHaveLength(0);
    expect(screen.getByText("Loading credit bundles")).toBeInTheDocument();
  });

  test("shows the bundles when the company fails to load", () => {
    const { catalog: held } = SCENARIOS.creditBundles();
    renderBundles(
      { catalog: held },
      {},
      { company: { error: new Error("Boom"), isPending: false } },
    );
    // No plan to judge by: only the bundles every plan may buy.
    expect(rows()).toHaveLength(2);
  });

  test.each([403, 404])("renders nothing on a %i", (status) => {
    const { container } = renderBundles(
      {},
      {},
      {
        catalog: {
          error: new SchematicApiError(status, "/catalog/view", "nope"),
        },
      },
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("offers a retry on other failures", () => {
    renderBundles(
      {},
      {},
      { catalog: { error: new SchematicApiError(500, "/catalog/view", "") } },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving credit bundles.",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("renders nothing when the catalog cannot sell through checkout", () => {
    const data = SCENARIOS.creditBundles();
    const held = data.catalog as ReturnType<typeof catalog>;
    const { container } = renderBundles({
      ...data,
      catalog: {
        ...held,
        capabilities: { ...held.capabilities, checkout: false },
      },
    });
    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing before a session, reading the public catalog", () => {
    const { container } = renderBundles(SCENARIOS.pricingTablePublic());
    expect(container).toBeEmptyDOMElement();
  });

  test("labels the list by the heading, or names it without one", () => {
    renderBundles(undefined, { showHeader: false, headingLevel: 3 });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(
      screen.getByRole("list", { name: "Credit bundles" }),
    ).toBeInTheDocument();
  });
});
