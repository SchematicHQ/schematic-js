import { fireEvent, screen } from "@testing-library/react";

import { render } from "../../../test/setup";
import type { CreditBundle } from "../../../types";

import { Credits } from "./Credits";

function makeBundle(overrides: Partial<CreditBundle> = {}): CreditBundle {
  return {
    id: "bundle-1",
    name: "Dashboard",
    creditId: "credit-1",
    quantity: 1200000,
    count: 0,
    price: { price: 10000, currency: "usd" },
    ...overrides,
  } as CreditBundle;
}

describe("`Credits` component", () => {
  describe("quantity purchasing", () => {
    it("renders a quantity input per bundle", () => {
      render(
        <Credits
          isLoading={false}
          bundles={[
            makeBundle({ count: 3 }),
            makeBundle({ id: "bundle-2", name: "Chart", count: 0 }),
          ]}
          isIndividualPurchase={false}
          updateCount={() => {}}
          toggle={() => {}}
        />,
      );

      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue(3);
      expect(screen.queryByText("Choose bundle")).not.toBeInTheDocument();
    });

    it("reports the entered count", () => {
      const updateCount = vi.fn();
      render(
        <Credits
          isLoading={false}
          bundles={[makeBundle()]}
          isIndividualPurchase={false}
          updateCount={updateCount}
          toggle={() => {}}
        />,
      );

      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "2" },
      });

      expect(updateCount).toHaveBeenCalledWith("bundle-1", 2);
    });
  });

  describe("individual purchasing", () => {
    it("replaces the quantity input with a choose action", () => {
      render(
        <Credits
          isLoading={false}
          bundles={[makeBundle(), makeBundle({ id: "bundle-2" })]}
          isIndividualPurchase
          updateCount={() => {}}
          toggle={() => {}}
        />,
      );

      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
      expect(screen.getAllByText("Choose bundle")).toHaveLength(2);
    });

    it("marks only the chosen bundle as selected", () => {
      render(
        <Credits
          isLoading={false}
          bundles={[
            makeBundle({ count: 1 }),
            makeBundle({ id: "bundle-2", name: "Chart", count: 0 }),
          ]}
          isIndividualPurchase
          updateCount={() => {}}
          toggle={() => {}}
        />,
      );

      expect(screen.getByText("Bundle selected")).toBeInTheDocument();
      expect(screen.getAllByText("Choose bundle")).toHaveLength(1);
    });

    it("marks every chosen bundle as selected, since bundles can be combined", () => {
      render(
        <Credits
          isLoading={false}
          bundles={[
            makeBundle({ count: 1 }),
            makeBundle({ id: "bundle-2", name: "Chart", count: 1 }),
            makeBundle({ id: "bundle-3", name: "Report", count: 0 }),
          ]}
          isIndividualPurchase
          updateCount={() => {}}
          toggle={() => {}}
        />,
      );

      expect(screen.getAllByText("Bundle selected")).toHaveLength(2);
      expect(screen.getAllByText("Choose bundle")).toHaveLength(1);
    });

    it("selects an unchosen bundle", () => {
      const toggle = vi.fn();
      render(
        <Credits
          isLoading={false}
          bundles={[makeBundle()]}
          isIndividualPurchase
          updateCount={() => {}}
          toggle={toggle}
        />,
      );

      fireEvent.click(screen.getByText("Choose bundle"));

      expect(toggle).toHaveBeenCalledWith("bundle-1");
    });

    it("lets the chosen bundle be deselected, so buying no credits stays reachable", () => {
      const toggle = vi.fn();
      render(
        <Credits
          isLoading={false}
          bundles={[makeBundle({ count: 1 })]}
          isIndividualPurchase
          updateCount={() => {}}
          toggle={toggle}
        />,
      );

      fireEvent.click(screen.getByText("Bundle selected"));

      expect(toggle).toHaveBeenCalledWith("bundle-1");
    });
  });
});
