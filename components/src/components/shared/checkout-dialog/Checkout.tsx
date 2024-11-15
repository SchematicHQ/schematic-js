import { useTheme } from "styled-components";
import { type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import { PaymentMethod } from "../../elements";
import { PaymentForm } from "../../shared";
import { Box, Text } from "../../ui";

interface CheckoutProps {
  setPaymentMethodId: (id: string) => void;
  togglePaymentForm: () => void;
  showPaymentForm: boolean;
  stripe: Promise<Stripe | null> | null;
  setupIntent?: SetupIntentResponseData;
}

export const Checkout = ({
  setPaymentMethodId,
  togglePaymentForm,
  setupIntent,
  showPaymentForm,
  stripe,
}: CheckoutProps) => {
  const theme = useTheme();

  const { data } = useEmbed();

  return (
    <>
      {showPaymentForm && setupIntent?.setupIntentClientSecret ? (
        <Elements
          stripe={stripe}
          options={{
            appearance: {
              theme: "stripe",
              variables: {
                // Base
                fontFamily: '"Public Sans", system-ui, sans-serif',
                spacingUnit: "0.25rem",
                borderRadius: "0.5rem",
                colorText: "#30313D",
                colorBackground: "#FFFFFF",
                colorPrimary: "#0570DE",
                colorDanger: "#DF1B41",

                // Layout
                gridRowSpacing: "1.5rem",
                gridColumnSpacing: "1.5rem",
              },
              rules: {
                ".Label": {
                  fontSize: "1rem",
                  fontWeight: "400",
                  marginBottom: "0.75rem",
                  color: theme.typography.text.color,
                },
              },
            },
            clientSecret: setupIntent.setupIntentClientSecret,
          }}
        >
          <Box $width="100%" $marginBottom="1.5rem">
            <Text $size={18}>Add payment method</Text>
          </Box>

          <PaymentForm onConfirm={(value) => setPaymentMethodId(value)} />

          {data.subscription?.paymentMethod && (
            <Box>
              <Text
                onClick={togglePaymentForm}
                $font={theme.typography.link.fontFamily}
                $size={theme.typography.link.fontSize}
                $weight={theme.typography.link.fontWeight}
                $color={theme.typography.link.color}
              >
                Use existing payment method
              </Text>
            </Box>
          )}
        </Elements>
      ) : (
        <>
          <PaymentMethod allowEdit={false} />

          <Box>
            <Text
              onClick={togglePaymentForm}
              $font={theme.typography.link.fontFamily}
              $size={theme.typography.link.fontSize}
              $weight={theme.typography.link.fontWeight}
              $color={theme.typography.link.color}
            >
              Change payment method
            </Text>
          </Box>
        </>
      )}
    </>
  );
};
