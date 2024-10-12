import { useState } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";
import type { CompanyPlanDetailResponseData } from "../../api";
import { useEmbed } from "../../hooks";
import { Box, Text } from "../ui";
import { StyledButton } from "./styles";

interface PaymentFormProps {
  plan?: CompanyPlanDetailResponseData;
  period?: string;
  onConfirm?: (paymentMethodId: string) => void;
}

export const PaymentForm = ({ onConfirm }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const { api } = useEmbed();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    if (!api || !stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setIsConfirmed(false);
    setMessage(null);

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
        setMessage(error.message as string);
      }
    } catch {
      setMessage("A problem occurred while saving your payment method.");
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
        <PaymentElement id="payment-element" />
      </Box>

      <StyledButton
        id="submit"
        disabled={isLoading || !stripe || !elements || isConfirmed}
        isLoading={isLoading}
        $color="primary"
      >
        <Text id="button-text">
          {isLoading ? "Loading" : "Save payment method"}
        </Text>
      </StyledButton>

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
