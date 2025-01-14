import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { SetupIntentResponseData } from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { PaymentMethod } from "../../elements";
import { PaymentForm } from "../../shared";
import { Box, Flex, Input, Text } from "../../ui";

interface CheckoutProps {
  setPaymentMethodId: (id: string) => void;
  togglePaymentForm: () => void;
  showPaymentForm: boolean;
  stripe: Promise<Stripe | null> | null;
  updatePromoCode: (code: string) => void;
  setupIntent?: SetupIntentResponseData;
}

export const Checkout = ({
  setPaymentMethodId,
  togglePaymentForm,
  setupIntent,
  showPaymentForm,
  stripe,
  updatePromoCode,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [discount, setDiscount] = useState("");

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
              $justifyContent="space-between"
              $alignItems="center"
              $backgroundColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.0625)"
                  : "hsla(0, 0%, 100%, 0.125)"
              }
              $padding="0.5rem 1rem"
              $borderRadius="9999px"
            >
              <Input
                type="text"
                value={discount}
                onChange={(event) => {
                  const value = event.target.value;
                  setDiscount(value);
                }}
              />

              <Text
                onClick={() => updatePromoCode(discount)}
                $font={theme.typography.link.fontFamily}
                $size={theme.typography.link.fontSize}
                $weight={theme.typography.link.fontWeight}
                $leading={1}
                $color={theme.typography.link.color}
              >
                {t("Apply discount")}
              </Text>
            </Flex>
          </Flex>
        </>
      )}
    </>
  );
};
