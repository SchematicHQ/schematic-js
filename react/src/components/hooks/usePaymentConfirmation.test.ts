import type { Stripe } from "@stripe/stripe-js";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { usePaymentConfirmation } from "./usePaymentConfirmation";

type ConfirmResult = Awaited<ReturnType<Stripe["confirmCardPayment"]>>;

const makeStripe = (
  confirmCardPayment: Stripe["confirmCardPayment"],
): Promise<Stripe | null> =>
  Promise.resolve({ confirmCardPayment } as unknown as Stripe);

const successResult = { paymentIntent: { id: "pi_ok" } } as ConfirmResult;

describe("usePaymentConfirmation", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test("defaults to idle state", () => {
    const { result } = renderHook(() =>
      usePaymentConfirmation({ stripe: null }),
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.isConfirming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("transitions to succeeded and calls onSuccess on success", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        clientSecret: "secret_a",
        onSuccess,
        onError,
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(confirmCardPayment).toHaveBeenCalledWith("secret_a");
    expect(result.current.status).toBe("succeeded");
    expect(result.current.error).toBeNull();
    expect(result.current.isConfirming).toBe(false);
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  test("transitions to failed and calls onError when Stripe rejects", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      error: { message: "card declined" },
    } as ConfirmResult);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        clientSecret: "secret_a",
        onSuccess,
        onError,
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("card declined");
    expect(onError).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test("fails immediately when stripe is missing", async () => {
    const onError = vi.fn();

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: null,
        clientSecret: "secret_a",
        onError,
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.error?.message).toMatch(/Missing required/);
    expect(onError).toHaveBeenCalledOnce();
  });

  test("fails immediately when clientSecret is missing", async () => {
    const onError = vi.fn();
    const confirmCardPayment = vi.fn();

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        onError,
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(result.current.status).toBe("failed");
    expect(confirmCardPayment).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  // Key behavior of the refactor: state is keyed to the secret it was
  // written for. When the parent supplies a new clientSecret, the prior
  // result must no longer be visible, even before any new confirmation
  // runs.
  test("derives idle when clientSecret changes after success", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);
    const stripe = makeStripe(confirmCardPayment);

    const { result, rerender } = renderHook(
      ({ clientSecret }: { clientSecret?: string }) =>
        usePaymentConfirmation({ stripe, clientSecret }),
      { initialProps: { clientSecret: "secret_a" } },
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(result.current.status).toBe("succeeded");

    rerender({ clientSecret: "secret_b" });

    // No effect should fire to reset state; the derived view is enough.
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.isConfirming).toBe(false);
  });

  test("derives idle when clientSecret changes after failure", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue({
      error: { message: "card declined" },
    } as ConfirmResult);
    const stripe = makeStripe(confirmCardPayment);

    const { result, rerender } = renderHook(
      ({ clientSecret }: { clientSecret?: string }) =>
        usePaymentConfirmation({ stripe, clientSecret }),
      { initialProps: { clientSecret: "secret_a" } },
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(result.current.status).toBe("failed");

    rerender({ clientSecret: "secret_b" });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  test("ignores duplicate confirmPayment for the same secret", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        clientSecret: "secret_a",
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(confirmCardPayment).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });

  test("reset clears state and allows reconfirmation of the same secret", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);

    const { result } = renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        clientSecret: "secret_a",
      }),
    );

    await act(async () => {
      await result.current.confirmPayment();
    });
    expect(result.current.status).toBe("succeeded");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(confirmCardPayment).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("succeeded");
  });

  test("autoConfirm runs confirmPayment when stripe and clientSecret are available", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);
    const onSuccess = vi.fn();

    renderHook(() =>
      usePaymentConfirmation({
        stripe: makeStripe(confirmCardPayment),
        clientSecret: "secret_a",
        autoConfirm: true,
        onSuccess,
      }),
    );

    await waitFor(() => {
      expect(confirmCardPayment).toHaveBeenCalledWith("secret_a");
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  test("uses the latest onSuccess / onError without re-running", async () => {
    const confirmCardPayment = vi.fn().mockResolvedValue(successResult);
    const stripe = makeStripe(confirmCardPayment);

    const firstOnSuccess = vi.fn();
    const secondOnSuccess = vi.fn();

    const { result, rerender } = renderHook(
      ({ onSuccess }: { onSuccess: () => void }) =>
        usePaymentConfirmation({
          stripe,
          clientSecret: "secret_a",
          onSuccess,
        }),
      { initialProps: { onSuccess: firstOnSuccess } },
    );

    // Swap the callback before confirming — the new one should be used.
    rerender({ onSuccess: secondOnSuccess });

    await act(async () => {
      await result.current.confirmPayment();
    });

    expect(firstOnSuccess).not.toHaveBeenCalled();
    expect(secondOnSuccess).toHaveBeenCalledOnce();
  });
});
