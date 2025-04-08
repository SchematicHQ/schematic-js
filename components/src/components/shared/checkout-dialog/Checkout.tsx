import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { useIsLightBackground } from "../../../hooks";
import { PaymentMethodDetails } from "../../elements";
import { Box, Flex, Input, Text } from "../../ui";

interface CheckoutProps {
  requiresPayment: boolean;
  setPaymentMethodId: (id: string) => void;
  updatePromoCode: (code: string) => void;
}

export const Checkout = ({
  requiresPayment,
  setPaymentMethodId,
  updatePromoCode,
}: CheckoutProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  const [discount, setDiscount] = useState("");

  if (!requiresPayment) {
    return null;
  }

  return (
    <>
      <PaymentMethodDetails setPaymentMethodId={setPaymentMethodId} />

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
  );
};
