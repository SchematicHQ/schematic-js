import { useState } from "react";
import {
  LinkAuthenticationElement,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import type { CompanyPlanDetailResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import { Box, Flex, Text } from "../../ui";
import { StyledButton } from "./styles";

interface PaymentFormProps {
  plan: CompanyPlanDetailResponseData;
  period: "month" | "year";
  onConfirm?: (paymentMethodId: string) => void;
}

export const PaymentForm = ({ plan, period, onConfirm }: PaymentFormProps) => {
  const stripe = useStripe();
  const elements = useElements();

  const { api, data } = useEmbed();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    const priceId =
      period === "month" ? plan.monthlyPrice?.id : plan.yearlyPrice?.id;
    if (!api || !stripe || !elements || !priceId) {
      return;
    }

    setIsLoading(true);
    setIsConfirmed(false);

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
      } else {
        setMessage("An unexpected error occured.");
      }

      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occured.");
      }

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
        height: "100%",
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <Box $width="100%" $marginBottom="1.5rem">
        <Text $size={18}>Add payment method</Text>
      </Box>
      <Flex
        $flexDirection="column"
        $gap="1.5rem"
        $marginBottom="1.5rem"
        $width="100%"
      >
        <LinkAuthenticationElement
          id="link-authentication-element"
          // Access the email value like so:
          // onChange={(event) => {
          //  setEmail(event.value.email);
          // }}
          //
          // Prefill the email field like so:
          // options={{defaultValues: {email: 'foo@bar.com'}}}
        />
      </Flex>

      <Flex $flexDirection="column" $width="100%" $flex="1" $height="100%">
        <PaymentElement id="payment-element" />
        {message && <div id="payment-message">{message}</div>}
      </Flex>

      <div>
        <StyledButton
          id="submit"
          disabled={
            isLoading ||
            !stripe ||
            !elements ||
            !data.stripeEmbed?.publishableKey ||
            !data.stripeEmbed?.setupIntentClientSecret ||
            isConfirmed
          }
          $size="md"
          $color="primary"
        >
          <span id="button-text">
            {isLoading ? "Loading" : "Save payment method"}
          </span>
        </StyledButton>
      </div>
    </form>
  );
};

export const StripeField = ({
  name,
  label,
  children,
}: {
  name: string;
  label?: string;
  children: React.ReactNode;
}) => {
  return (
    <div>
      {label && (
        <label className="" htmlFor={name}>
          {label}
        </label>
      )}
      <div>{children}</div>
    </div>
  );
};
