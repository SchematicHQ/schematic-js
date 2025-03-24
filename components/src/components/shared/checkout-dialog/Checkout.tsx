import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { PaymentMethod } from "../../elements";
import { PaymentForm } from "../../shared";
import { Box, Flex, Input, Loader, Text } from "../../ui";

interface CheckoutProps {
  requiresPayment: boolean;
  setPaymentMethodId: (id: string) => void;
  togglePaymentForm: () => void;
  showPaymentForm: boolean;
  updatePromoCode: (code: string) => void;
}

export const Checkout = ({
  requiresPayment,
  setPaymentMethodId,
  togglePaymentForm,
  showPaymentForm,
  updatePromoCode,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [discount, setDiscount] = useState("");

  useEffect(() => {
    if (api && data.component?.id) {
      api
        .getSetupIntent({ componentId: data.component.id })
        .then((res) => setSetupIntent(res.data));
    }
  }, [api, data.component?.id]);

  useEffect(() => {
    if (setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [setupIntent?.publishableKey]);

  if (!requiresPayment) {
    return null;
  }

  if (!stripe) {
    return (
      <Flex
        $justifyContent="center"
        $alignItems="center"
        $flexGrow={1}
        $marginTop="-3.5rem"
      >
        <Loader $size="3xl" />
      </Flex>
    );
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
            <Text
              $font={theme.typography.text.fontFamily}
              $size={18}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {t("Add payment method")}
            </Text>
          </Box>

          <PaymentForm
            onConfirm={(value) => {
              setPaymentMethodId(value);
              togglePaymentForm();
            }}
          />

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

          <Flex $flexDirection="column" $gap="1rem">
            <Text
              as={Box}
              $font={theme.typography.heading4.fontFamily}
              $size={theme.typography.heading4.fontSize}
              $weight={theme.typography.heading4.fontWeight}
              $color={theme.typography.heading4.color}
            >
              {t("Discount")}
            </Text>

            <Flex
              $alignItems="center"
              $gap="1rem"
              $backgroundColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.0625)"
                  : "hsla(0, 0%, 100%, 0.125)"
              }
              $borderRadius="9999px"
            >
              <Box $flexGrow={1}>
                <Input
                  $size="full"
                  $color="secondary"
                  $variant="text"
                  type="text"
                  placeholder={t("Enter discount code")}
                  value={discount}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDiscount(value);
                  }}
                  style={{
                    backgroundColor: "transparent",
                    border: "none",
                    borderRadius: "9999px",
                    maxWidth: "100%",
                    padding: "0.5rem 1rem",
                  }}
                />
              </Box>

              <Box $flexShrink={0} $padding="0.5rem 1rem">
                <Text
                  onClick={() => updatePromoCode(discount)}
                  $font={theme.typography.link.fontFamily}
                  $size={theme.typography.link.fontSize}
                  $weight={theme.typography.link.fontWeight}
                  $color={theme.typography.link.color}
                  $leading={1}
                >
                  {t("Apply discount")}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </>
      )}
    </>
  );
};
