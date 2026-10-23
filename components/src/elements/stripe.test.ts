import type { Stripe } from "@stripe/stripe-js";
import { vi } from "vitest";

import { PaymentNotConfirmedError, confirmPayment } from "./stripe";

describe("confirmPayment", () => {
  test("resolves once Stripe confirms the payment", async () => {
    const confirmCardPayment = vi.fn(async () => ({
      paymentIntent: { status: "succeeded" },
    }));
    await expect(
      confirmPayment({ confirmCardPayment } as unknown as Stripe, "pi_secret"),
    ).resolves.toBeUndefined();
    expect(confirmCardPayment).toHaveBeenCalledWith("pi_secret");
  });

  test("rejects with Stripe's message when the customer does not complete it", async () => {
    const confirmCardPayment = vi.fn(async () => ({
      error: { message: "Your card was declined." },
    }));
    await expect(
      confirmPayment({ confirmCardPayment } as unknown as Stripe, "pi_secret"),
    ).rejects.toThrow("Your card was declined.");
  });

  test("names the card Stripe took off the intent, so a retry can give it back", async () => {
    const confirmCardPayment = vi.fn(async () => ({
      error: {
        message: "Authentication failed.",
        payment_intent: {
          last_payment_error: { payment_method: { id: "pm_failed" } },
        },
      },
    }));
    const failure = await confirmPayment(
      { confirmCardPayment } as unknown as Stripe,
      "pi_secret",
    ).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(PaymentNotConfirmedError);
    expect((failure as PaymentNotConfirmedError).paymentMethodId).toBe(
      "pm_failed",
    );
  });

  test("confirms with the card it is given", async () => {
    const confirmCardPayment = vi.fn(async () => ({
      paymentIntent: { status: "succeeded" },
    }));
    await confirmPayment(
      { confirmCardPayment } as unknown as Stripe,
      "pi_secret",
      "pm_failed",
    );
    expect(confirmCardPayment).toHaveBeenCalledWith("pi_secret", {
      payment_method: "pm_failed",
    });
  });
});
