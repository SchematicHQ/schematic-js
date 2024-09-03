import { useState } from "react";
import {
  LinkAuthenticationElement,
  PaymentElement,
} from "@stripe/react-stripe-js";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { Box, Flex } from "../../ui";

export const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error.type === "card_error" || error.type === "validation_error") {
      setMessage(error.message as string);
    } else {
      setMessage("An unexpected error occured.");
    }

    setIsLoading(false);
  };

  return (
    <form
      id="payment-form"
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        $fontSize="18px"
        $marginBottom="1.5rem"
        $display="inline-block"
        $width="100%"
      >
        Add payment method{" "}
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
        <button
          disabled={isLoading || !stripe || !elements}
          id="submit"
          style={{
            backgroundColor: "#000000",
            color: "#ffffff",
            paddingTop: ".75rem",
            paddingBottom: ".75rem",
            fontSize: "15px",
            width: "100%",
            borderRadius: ".5rem",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <span id="button-text" style={{ marginTop: "2.5rem" }}>
            {isLoading ? (
              <div className="spinner" id="spinner"></div>
            ) : (
              "Save payment method"
            )}
          </span>
        </button>
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
