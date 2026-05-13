import type { Stripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePaymentConfirmationProps {
  stripe: Promise<Stripe | null> | null;
  clientSecret?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  autoConfirm?: boolean;
}

type Status = "idle" | "confirming" | "succeeded" | "failed";

interface UsePaymentConfirmationReturn {
  confirmPayment: () => Promise<void>;
  isConfirming: boolean;
  error: Error | null;
  status: Status;
  reset: () => void;
}

interface State {
  secret: string | undefined;
  status: Status;
  error: Error | null;
}

export const usePaymentConfirmation = ({
  stripe,
  clientSecret,
  onSuccess,
  onError,
  autoConfirm = false,
}: UsePaymentConfirmationProps): UsePaymentConfirmationReturn => {
  const [state, setState] = useState<State>(() => ({
    secret: clientSecret,
    status: "idle",
    error: null,
  }));

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  });

  const confirmedSecrets = useRef(new Set<string>());
  const abortControllerRef = useRef<AbortController | null>(null);

  // `State` is keyed to the secret it was written for; when `clientSecret`
  // changes, we treat the prior secret's state as if it doesn't exist
  const isCurrentSecret = state.secret === clientSecret;
  const status: Status = isCurrentSecret ? state.status : "idle";
  const error = isCurrentSecret ? state.error : null;
  const isConfirming = status === "confirming";

  const confirmPayment = useCallback(async () => {
    if (!stripe || !clientSecret) {
      const err = new Error(
        "Missing required parameters: stripe instance or client secret",
      );
      setState({ secret: clientSecret, status: "failed", error: err });
      onErrorRef.current?.(err);
      return;
    }

    if (confirmedSecrets.current.has(clientSecret)) {
      console.warn("Payment confirmation already attempted or in progress");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setState({ secret: clientSecret, status: "confirming", error: null });

    try {
      confirmedSecrets.current.add(clientSecret);

      const stripeInstance = await stripe;

      if (signal.aborted) {
        throw new Error("Payment confirmation was cancelled");
      }

      if (!stripeInstance) {
        throw new Error("Failed to load Stripe instance");
      }

      const result = await stripeInstance.confirmCardPayment(clientSecret);

      if (signal.aborted) {
        throw new Error("Payment confirmation was cancelled");
      }

      if (result.error) {
        throw new Error(result.error.message || "Payment confirmation failed");
      }

      setState({ secret: clientSecret, status: "succeeded", error: null });
      onSuccessRef.current?.();
    } catch (err) {
      if (!signal.aborted) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setState({ secret: clientSecret, status: "failed", error });
        onErrorRef.current?.(error);
        confirmedSecrets.current.delete(clientSecret);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [stripe, clientSecret]);

  const reset = useCallback(() => {
    if (clientSecret) {
      confirmedSecrets.current.delete(clientSecret);
    }

    setState({ secret: clientSecret, status: "idle", error: null });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [clientSecret]);

  useEffect(() => {
    if (autoConfirm && status === "idle" && stripe && clientSecret) {
      queueMicrotask(confirmPayment);
    }
  }, [autoConfirm, stripe, clientSecret, status, confirmPayment]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    confirmPayment,
    isConfirming,
    error,
    status,
    reset,
  };
};
