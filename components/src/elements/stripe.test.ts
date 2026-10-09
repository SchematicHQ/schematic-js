import type { Stripe } from "@stripe/stripe-js";
import { vi } from "vitest";

import { confirmPayment } from "./stripe";

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
});
