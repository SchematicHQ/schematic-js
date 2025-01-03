import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import { PaymentMethod } from "../../elements";
import { PaymentForm } from "../../shared";
import { Box, Loader, Text } from "../../ui";

interface CheckoutProps {
  setPaymentMethodId: (id: string) => void;
  togglePaymentForm: () => void;
  showPaymentForm: boolean;
}

export const Checkout = ({
  setPaymentMethodId,
  togglePaymentForm,
  showPaymentForm,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data } = useEmbed();

  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  useEffect(() => {
    if (!setupIntent && api && data.component?.id) {
      api
        .getSetupIntent({ componentId: data.component.id })
        .then((res) => setSetupIntent(res.data));
    }
  }, [setupIntent, api, data.component?.id]);

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  if (!stripe) {
    return <Loader $size="lg" />;
  }

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
            <Text $size={18}>{t("Add payment method")}</Text>
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
                {t("Use existing payment method")}
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
              {t("Change payment method")}
            </Text>
          </Box>
        </>
      )}
    </>
  );
};
