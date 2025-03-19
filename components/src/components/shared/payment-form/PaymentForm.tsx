import { FormEventHandler, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

import { useEmbed } from "../../../hooks";
import { Box, EmbedButton, Text } from "../../ui";

interface PaymentFormProps {
  onConfirm?: (paymentMethodId: string) => void;
}

export const PaymentForm = ({ onConfirm }: PaymentFormProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const stripe = useStripe();
  const elements = useElements();

  const { api } = useEmbed();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
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
        elements.getElement("payment")?.collapse();
        onConfirm(setupIntent.payment_method);
        setIsConfirmed(true);
      } else {
        // TODO: handle other payment method types
      }

      if (error?.type === "card_error" || error?.type === "validation_error") {
        setMessage(error.message as string);
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
        <PaymentElement id="payment-element" />
      </Box>

      <EmbedButton
        id="submit"
        disabled={isLoading || !stripe || !elements || isConfirmed}
        isLoading={isLoading}
        style={{ flexShrink: 0 }}
        $color="primary"
      >
        {isLoading ? t("Loading") : t("Save payment method")}
      </EmbedButton>

      {message && (
        <Box $margin="1rem 0">
          <Text
            id="payment-message"
            $font={theme.typography.text.fontFamily}
            $size={15}
            $weight={500}
            $color="#DB6669"
          >
            {message}
          </Text>
        </Box>
      )}
    </form>
  );
};
