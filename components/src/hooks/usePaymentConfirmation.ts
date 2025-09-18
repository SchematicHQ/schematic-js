import type { Stripe } from "@stripe/stripe-js";
import { useCallback, useEffect, useRef, useState } from "react";

interface UsePaymentConfirmationProps {
  stripe: Promise<Stripe | null> | null;
  clientSecret?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  autoConfirm?: boolean;
}

interface UsePaymentConfirmationReturn {
  confirmPayment: () => Promise<void>;
  isConfirming: boolean;
  error: Error | null;
  status: "idle" | "confirming" | "succeeded" | "failed";
  reset: () => void;
}

export const usePaymentConfirmation = ({
  stripe,
  clientSecret,
  onSuccess,
  onError,
  autoConfirm = false,
}: UsePaymentConfirmationProps): UsePaymentConfirmationReturn => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<
    "idle" | "confirming" | "succeeded" | "failed"
  >("idle");

  const confirmedSecrets = useRef(new Set<string>());
  const abortControllerRef = useRef<AbortController | null>(null);

  const confirmPayment = useCallback(async () => {
    if (!stripe || !clientSecret) {
      const error = new Error(
        "Missing required parameters: stripe instance or client secret",
      );
      setError(error);
      setStatus("failed");
      onError?.(error);
      return;
    }

    if (confirmedSecrets.current.has(clientSecret) || isConfirming) {
      console.warn("Payment confirmation already attempted or in progress");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsConfirming(true);
    setError(null);
    setStatus("confirming");

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

      setStatus("succeeded");
      onSuccess?.();
    } catch (err) {
      if (!signal.aborted) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
        setStatus("failed");
        onError?.(error);
        confirmedSecrets.current.delete(clientSecret);
      }
    } finally {
      if (!signal.aborted) {
        setIsConfirming(false);
      }
      abortControllerRef.current = null;
    }
  }, [stripe, clientSecret, onSuccess, onError, isConfirming]);

  const reset = useCallback(() => {
    if (clientSecret) {
      confirmedSecrets.current.delete(clientSecret);
    }
    setIsConfirming(false);
    setError(null);
    setStatus("idle");

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [clientSecret]);

  useEffect(() => {
    if (autoConfirm && status === "idle" && stripe && clientSecret) {
      confirmPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConfirm, stripe, clientSecret]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (clientSecret && status !== "idle") {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  return {
    confirmPayment,
    isConfirming,
    error,
    status,
    reset,
  };
};
