import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Box, Button, Text } from "../../ui";

interface PaymentFormProps {
  onConfirm?: (paymentMethodId: string) => void;
}

export const PaymentForm = ({ onConfirm }: PaymentFormProps) => {
  const { t } = useTranslation();

  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setIsConfirmed(false);
    setMessage(undefined);

    try {
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (onConfirm && typeof setupIntent?.payment_method === "string") {
        onConfirm(setupIntent.payment_method);
        setIsConfirmed(true);
      } else {
        // TODO: handle other payment method types
      }

      if (error?.type === "card_error" || error?.type === "validation_error") {
        setMessage(error.message);
      }
    } catch {
      setMessage(t("A problem occurred while saving your payment method."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <Box $marginBottom="1.5rem">
        <PaymentElement
          id="payment-element"
          onChange={(event) => {
            setIsComplete(event.complete);
          }}
        />
      </Box>

      <Button
        id="submit"
        disabled={
          isLoading || !stripe || !elements || isConfirmed || !isComplete
        }
        style={{ flexShrink: 0 }}
        $color="primary"
        $isLoading={isLoading}
        $fullWidth
      >
        {isLoading ? t("Loading") : t("Save payment method")}
      </Button>

      {message && (
        <Box $margin="1rem 0">
          <Text id="payment-message" $size={15} $weight={500} $color="#DB6669">
            {message}
          </Text>
        </Box>
      )}
    </form>
  );
};
