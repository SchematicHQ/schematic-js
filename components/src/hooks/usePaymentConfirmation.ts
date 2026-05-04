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
  const [prevClientSecret, setPrevClientSecret] = useState(clientSecret);

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

    if (confirmedSecrets.current.has(clientSecret)) {
      console.warn("Payment confirmation already attempted or in progress");
      return;
    }
    confirmedSecrets.current.add(clientSecret);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setIsConfirming(true);
    setError(null);
    setStatus("confirming");

    try {
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
  }, [stripe, clientSecret, onSuccess, onError]);

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

  if (clientSecret !== prevClientSecret) {
    setPrevClientSecret(clientSecret);
    setIsConfirming(false);
    setError(null);
    setStatus("idle");
  }

  useEffect(() => {
    if (
      autoConfirm &&
      stripe &&
      clientSecret &&
      !confirmedSecrets.current.has(clientSecret)
    ) {
      confirmPayment();
    }
  }, [autoConfirm, stripe, clientSecret, confirmPayment]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [clientSecret]);

  return {
    confirmPayment,
    isConfirming,
    error,
    status,
    reset,
  };
};
