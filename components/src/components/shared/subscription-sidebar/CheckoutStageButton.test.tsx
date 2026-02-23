import { vi } from "vitest";

import { act, fireEvent, render, screen } from "../../../test/setup";

import { CheckoutStageButton } from "./CheckoutStageButton";

describe("`CheckoutStageButton` component", () => {
  const defaultProps = {
    canCheckout: true,
    checkout: vi.fn(),
    checkoutStage: "plan",
    checkoutStages: [
      { id: "plan", name: "Plan" },
      { id: "checkout", name: "Checkout" },
    ],
    hasPaymentMethod: false,
    hasPlan: true,
    inEditMode: false,
    isLoading: false,
    isPaymentMethodRequired: true,
    isSelectedPlanTrialable: false,
    setCheckoutStage: vi.fn(),
    trialPaymentMethodRequired: false,
    shouldTrial: false,
    willTrialWithoutPaymentMethod: false,
    willScheduleDowngrade: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canCheckout prop", () => {
    test("button is enabled when canCheckout is true", () => {
      render(<CheckoutStageButton {...defaultProps} canCheckout={true} />);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    test("button is disabled when canCheckout is false", () => {
      render(<CheckoutStageButton {...defaultProps} canCheckout={false} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("button is disabled when canCheckout is false even with valid plan", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          canCheckout={false}
          hasPlan={true}
          isLoading={false}
          inEditMode={false}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("disabled states", () => {
    test("button is disabled when isLoading is true", () => {
      render(<CheckoutStageButton {...defaultProps} isLoading={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("button is disabled when hasPlan is false", () => {
      render(<CheckoutStageButton {...defaultProps} hasPlan={false} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("button is disabled when inEditMode is true", () => {
      render(<CheckoutStageButton {...defaultProps} inEditMode={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("button is disabled when multiple disable conditions are true", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          canCheckout={false}
          isLoading={true}
          hasPlan={false}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });
  });

  describe("checkout stage navigation", () => {
    test("calls setCheckoutStage when clicking button at plan stage", async () => {
      const setCheckoutStage = vi.fn();

      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          setCheckoutStage={setCheckoutStage}
        />,
      );

      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });

      expect(setCheckoutStage).toHaveBeenCalledWith("checkout");
    });

    test("displays correct next stage text", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          checkoutStages={[
            { id: "plan", name: "Plan" },
            { id: "addons", name: "Add-ons" },
            { id: "checkout", name: "Checkout" },
          ]}
        />,
      );

      expect(screen.getByText(/Add-ons/)).toBeInTheDocument();
    });
  });

  describe("checkout stage", () => {
    test("shows 'Pay now' text at checkout stage with payment method required", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="checkout"
          hasPaymentMethod={true}
          isPaymentMethodRequired={true}
        />,
      );

      expect(screen.getByText("Pay now")).toBeInTheDocument();
    });

    test("shows 'Start trial' text when willTrialWithoutPaymentMethod is true", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="checkout"
          hasPaymentMethod={true}
          isPaymentMethodRequired={true}
          willTrialWithoutPaymentMethod={true}
        />,
      );

      expect(screen.getByText("Start trial")).toBeInTheDocument();
    });

    test("checkout button is disabled without payment method when required", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="checkout"
          hasPaymentMethod={false}
          isPaymentMethodRequired={true}
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("calls checkout function when clicking pay now", async () => {
      const checkout = vi.fn();

      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="checkout"
          hasPaymentMethod={true}
          isPaymentMethodRequired={true}
          checkout={checkout}
        />,
      );

      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });

      expect(checkout).toHaveBeenCalled();
    });
  });

  describe("no payment required flow", () => {
    test("shows 'Subscribe and close' when no payment is required", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          checkoutStages={[{ id: "plan", name: "Plan" }]}
          isPaymentMethodRequired={false}
        />,
      );

      expect(screen.getByText("Subscribe and close")).toBeInTheDocument();
    });

    test("calls checkout directly when no payment required and no next stage", async () => {
      const checkout = vi.fn();

      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          checkoutStages={[{ id: "plan", name: "Plan" }]}
          isPaymentMethodRequired={false}
          checkout={checkout}
        />,
      );

      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });

      expect(checkout).toHaveBeenCalled();
    });
  });

  describe("trial flow with payment method required", () => {
    test("navigates to checkout when trialing with payment method required", async () => {
      const setCheckoutStage = vi.fn();

      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          isSelectedPlanTrialable={true}
          trialPaymentMethodRequired={true}
          shouldTrial={true}
          setCheckoutStage={setCheckoutStage}
        />,
      );

      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });

      expect(setCheckoutStage).toHaveBeenCalledWith("checkout");
    });

    test("displays Checkout as next stage for trialing plans", () => {
      render(
        <CheckoutStageButton
          {...defaultProps}
          checkoutStage="plan"
          isSelectedPlanTrialable={true}
          trialPaymentMethodRequired={true}
          shouldTrial={true}
        />,
      );

      expect(screen.getByText(/Checkout/)).toBeInTheDocument();
    });
  });
});
